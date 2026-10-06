import { WeddingEvent, UploadBatchItem, MediaType, MemoryUpload } from './memoriesTypes';

export const SUPPORTED_PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm'];

export const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  mediaType: MediaType;
}

/**
 * Validate a selected file against event limits and format rules
 */
export function validateFile(file: File, event: WeddingEvent): FileValidationResult {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  const isPhoto =
    mime.startsWith('image/') ||
    SUPPORTED_PHOTO_EXTENSIONS.some((ext) => name.endsWith(ext));

  const isVideo =
    mime.startsWith('video/') ||
    SUPPORTED_VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));

  if (!isPhoto && !isVideo) {
    return {
      valid: false,
      error: `Unsupported file type "${file.name}". Please upload JPEG, PNG, WEBP, HEIC, MP4, MOV, or WEBM.`,
      mediaType: 'photo',
    };
  }

  const mediaType: MediaType = isVideo ? 'video' : 'photo';
  const maxBytes = isVideo
    ? (event.video_size_limit_mb || 500) * 1024 * 1024
    : (event.photo_size_limit_mb || 25) * 1024 * 1024;

  if (file.size > maxBytes) {
    const limitMb = isVideo ? event.video_size_limit_mb || 500 : event.photo_size_limit_mb || 25;
    return {
      valid: false,
      error: `File "${file.name}" exceeds the ${limitMb}MB size limit.`,
      mediaType,
    };
  }

  return { valid: true, mediaType };
}

/**
 * Extract image dimensions using browser Image constructor
 */
export async function extractImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({});
      };
      img.src = url;
    } catch {
      resolve({});
    }
  });
}

/**
 * Extract video duration and dimensions using browser Video element
 */
export async function extractVideoMetadata(
  file: File
): Promise<{ width?: number; height?: number; duration?: number }> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: video.videoWidth || undefined,
          height: video.videoHeight || undefined,
          duration: video.duration ? Math.round(video.duration * 10) / 10 : undefined,
        });
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({});
      };
      video.src = url;
    } catch {
      resolve({});
    }
  });
}

/**
 * Upload an individual item with live progress and cancelability
 */
export async function uploadSingleMemory(
  item: UploadBatchItem,
  event: WeddingEvent,
  guestName: string,
  onProgress: (progress: number) => void
): Promise<{ success: boolean; uploadRecord?: MemoryUpload; error?: string }> {
  let xhr: XMLHttpRequest | null = null;

  item.cancelFn = () => {
    if (xhr) {
      xhr.abort();
    }
  };

  try {
    // 1. Request presigned upload authorization
    let presignData: any = null;
    try {
      const presignRes = await fetch('/api/memories/presign-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          filename: item.originalFilename,
          mimeType: item.mimeType || (item.mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
          fileSize: item.fileSize,
          guestName: guestName || null,
        }),
      });

      if (!presignRes.ok) {
        const errJson = await presignRes.json().catch(() => ({}));
        throw new Error(errJson.error || `Upload authorization failed (HTTP ${presignRes.status}).`);
      }

      presignData = await presignRes.json();
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
      throw new Error(err.message || 'Unable to connect to upload server.');
    }

    const uniqueId = presignData?.uploadId || crypto.randomUUID();
    const extension = item.originalFilename.split('.').pop() || (item.mediaType === 'video' ? 'mp4' : 'jpg');
    const storageKey = presignData?.storageKey || `events/${event.id}/originals/${uniqueId}.${extension}`;

    // 2. Perform direct R2 upload while extracting image dimensions concurrently in background
    const dimensionsPromise: Promise<{ width?: number; height?: number; duration?: number }> =
      item.mediaType === 'photo' ? extractImageDimensions(item.file) : extractVideoMetadata(item.file);

    if (presignData?.uploadUrl && presignData.provider === 'r2') {
      // Direct R2 presigned PUT upload
      await new Promise<void>((resolve, reject) => {
        xhr = new XMLHttpRequest();
        xhr.open('PUT', presignData.uploadUrl, true);
        xhr.setRequestHeader('Content-Type', item.mimeType || 'application/octet-stream');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr!.status >= 200 && xhr!.status < 300) {
            resolve();
          } else {
            reject(new Error(`Cloudflare R2 returned HTTP ${xhr!.status}. Check R2 bucket CORS settings.`));
          }
        };

        xhr.onerror = () => reject(new Error('Network or CORS error during upload to Cloudflare R2.'));
        xhr.onabort = () => reject(new Error('Upload was cancelled.'));
        xhr.send(item.file);
      });
    } else {
      throw new Error('Cloud storage provider is not configured. Please check R2 environment variables.');
    }

    // 3. Obtain pre-extracted dimensions (already resolved in background during the upload transfer)
    const dimensions: { width?: number; height?: number; duration?: number } = await dimensionsPromise.catch(() => ({}));

    // 4. Complete upload in DB
    const initialStatus = event.moderation_enabled ? 'pending' : 'ready';
    const clientCompletedRecord: MemoryUpload = {
      id: uniqueId,
      event_id: event.id,
      guest_name: guestName ? guestName.trim() : null,
      original_filename: item.originalFilename,
      storage_key: storageKey,
      media_type: item.mediaType,
      mime_type: item.mimeType || (item.mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
      file_size: item.fileSize,
      status: initialStatus,
      is_visible: true,
      is_deleted: false,
      width: dimensions.width,
      height: dimensions.height,
      duration: dimensions.duration,
      uploaded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Notify backend / Supabase to finalize status and dimensions in parallel / background
    // (Don't let network roundtrips freeze the user interface)
    fetch('/api/memories/complete-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId: uniqueId,
        eventId: event.id,
        status: initialStatus,
        ...dimensions,
      }),
    }).catch((completeErr) => {
      console.warn('Background complete-upload notification error:', completeErr);
    });

    return { success: true, uploadRecord: clientCompletedRecord };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to upload file. Please try again.',
    };
  }
}
