import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

export const config = {
  runtime: 'nodejs',
};

const ALLOWED_PHOTO_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

function getExtension(filename: string, mimeType: string): string {
  const parts = filename.split('.');
  if (parts.length > 1) {
    const ext = parts.pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    if (ext) return ext;
  }
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('heic')) return 'heic';
  if (mimeType.includes('quicktime') || mimeType.includes('mov')) return 'mov';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('webm')) return 'webm';
  return 'bin';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      eventId,
      filename,
      mimeType,
      fileSize,
      guestName,
      inviteeId,
    } = req.body || {};

    if (!eventId || !filename || !mimeType || !fileSize) {
      return res.status(400).json({ error: 'Missing required parameters (eventId, filename, mimeType, fileSize)' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    // Verify event exists and uploads are currently permitted
    if (supabaseUrl && supabaseKey) {
      try {
        const evRes = await fetch(
          `${supabaseUrl}/rest/v1/wedding_events?id=eq.${encodeURIComponent(eventId)}&select=id,upload_enabled,upload_closing_at&limit=1`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );
        if (evRes.ok) {
          const events = (await evRes.json()) as any[];
          if (!events || events.length === 0) {
            return res.status(404).json({ error: 'Event not found.' });
          }
          const event = events[0];
          if (event.upload_enabled === false) {
            return res.status(403).json({ error: 'Media uploads are disabled for this event.' });
          }
          if (event.upload_closing_at && new Date(event.upload_closing_at).getTime() < Date.now()) {
            return res.status(403).json({ error: 'Media upload deadline has passed for this event.' });
          }
        }
      } catch (evErr) {
        console.warn('Could not verify event existence in presign-upload:', evErr);
      }
    }

    const isPhoto = ALLOWED_PHOTO_MIMES.has(mimeType.toLowerCase());
    const isVideo = ALLOWED_VIDEO_MIMES.has(mimeType.toLowerCase());

    if (!isPhoto && !isVideo) {
      return res.status(400).json({ error: `File type "${mimeType}" is not supported.` });
    }

    const mediaType = isPhoto ? 'photo' : 'video';
    const extension = getExtension(filename, mimeType);
    const uniqueId = crypto.randomUUID();
    const storageKey = `events/${eventId}/originals/${uniqueId}.${extension}`;

    // Verify R2 environment credentials
    const r2AccountId = process.env.R2_ACCOUNT_ID;
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const r2BucketName = process.env.R2_BUCKET_NAME;

    const hasR2Config = Boolean(r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName);

    let uploadUrl = '';
    let provider: 'r2' | 'supabase_storage' | 'mock' = 'mock';

    if (hasR2Config) {
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKeyId!,
          secretAccessKey: r2SecretAccessKey!,
        },
      });

      const putCommand = new PutObjectCommand({
        Bucket: r2BucketName!,
        Key: storageKey,
        ContentType: mimeType,
        ContentLength: fileSize,
      });

      // 15-minute expiration
      uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 900 });
      provider = 'r2';
    } else {
      // If deployed or in production without R2 config, fail explicitly with descriptive error
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
      if (isProduction) {
        return res.status(500).json({
          error: 'Cloudflare R2 storage credentials are not configured in Vercel Environment Variables. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.',
          code: 'R2_CONFIG_MISSING',
        });
      }
      provider = 'mock';
      uploadUrl = `/api/memories/upload-mock?key=${encodeURIComponent(storageKey)}`;
    }

    // Insert pending row into Supabase memory_uploads
    let uploadId = uniqueId;

    if (supabaseUrl && supabaseKey) {
      try {
        const dbRes = await fetch(`${supabaseUrl}/rest/v1/memory_uploads`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            id: uniqueId,
            event_id: eventId,
            invitee_id: inviteeId || null,
            guest_name: guestName ? String(guestName).trim().slice(0, 100) : null,
            original_filename: String(filename).slice(0, 255),
            storage_key: storageKey,
            media_type: mediaType,
            mime_type: mimeType,
            file_size: fileSize,
            status: 'pending',
            is_visible: true,
            is_deleted: false,
          }),
        });

        if (dbRes.ok) {
          uploadId = uniqueId;
        }
      } catch (dbErr) {
        console.warn('Could not insert memory_uploads in database:', dbErr);
      }
    }

    return res.status(200).json({
      success: true,
      uploadId,
      storageKey,
      uploadUrl,
      provider,
      mediaType,
      expiresIn: 900,
    });
  } catch (err: any) {
    console.error('Error generating presigned upload authorization:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
