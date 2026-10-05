export type MediaType = 'photo' | 'video';

export type UploadStatus =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'deleted';

export interface WeddingEvent {
  id: string;
  name: string;
  slug: string;
  event_date: string | null;
  welcome_message: string | null;
  upload_enabled: boolean;
  gallery_enabled: boolean;
  live_display_enabled?: boolean;
  guest_downloads_enabled: boolean;
  moderation_enabled: boolean;
  passcode_enabled: boolean;
  passcode_hash?: string | null;
  photo_size_limit_mb: number;
  video_size_limit_mb: number;
  max_files_per_batch: number;
  allow_guest_name: boolean;
  upload_closing_at?: string | null;
  gallery_closing_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemoryUpload {
  id: string;
  event_id: string;
  invitee_id?: string | null;
  guest_name?: string | null;
  original_filename: string;
  storage_key: string;
  media_type: MediaType;
  mime_type: string;
  file_size: number;
  status: UploadStatus;
  is_visible: boolean;
  is_deleted: boolean;
  thumbnail_key?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  checksum?: string | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
  // Temporary client URL (or signed URL) for previewing/downloading
  url?: string;
  thumbnail_url?: string;
}

export interface MemoryArchiveJob {
  id: string;
  event_id: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  total_files: number;
  total_bytes: number;
  parts: Array<{
    part_number: number;
    filename: string;
    download_url: string;
    file_count: number;
    byte_size: number;
  }>;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface UploadBatchItem {
  id: string; // client temporary ID
  file: File;
  previewUrl: string;
  originalFilename: string;
  mediaType: MediaType;
  fileSize: number;
  mimeType: string;
  status: 'queued' | 'requesting_auth' | 'uploading' | 'completing' | 'ready' | 'failed' | 'cancelled';
  progress: number; // 0 to 100
  error?: string;
  storageKey?: string;
  remoteId?: string;
  cancelFn?: () => void;
}

export interface MemoriesStats {
  totalUploads: number;
  totalPhotos: number;
  totalVideos: number;
  totalStorageBytes: number;
  uniqueContributors: number;
  uploadsToday: number;
  pendingModeration: number;
  hiddenCount: number;
}

export type MemoriesFilter = 'all' | 'photos' | 'videos' | 'pending' | 'hidden' | 'deleted';
