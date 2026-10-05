import { supabase, isSupabaseConfigured } from './supabase';
import { WeddingEvent, MemoryUpload, MemoriesStats, UploadStatus } from './memoriesTypes';
import { weddingConfig } from '@/config/weddingConfig';

const EVENTS_CACHE_KEY = 'wedding_memories_events_cache_v1';
const UPLOADS_CACHE_KEY = 'wedding_memories_uploads_cache_v1';

// Default fallback event when Supabase table is not yet seeded
export const DEFAULT_FALLBACK_EVENT: WeddingEvent = {
  id: '00000000-0000-0000-0000-000000000001',
  name: `${weddingConfig.couple.bride} & ${weddingConfig.couple.groom}'s Celebration`,
  slug: 'safiyya-sharrafuth',
  event_date: weddingConfig.event.targetDate,
  welcome_message: 'Capture and share your favourite photos & videos from our special wedding celebration. Thank you for celebrating with us!',
  upload_enabled: true,
  gallery_enabled: false,
  live_display_enabled: true,
  guest_downloads_enabled: false,
  moderation_enabled: false,
  passcode_enabled: false,
  passcode_hash: null,
  photo_size_limit_mb: 25,
  video_size_limit_mb: 500,
  max_files_per_batch: 100,
  allow_guest_name: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function getLocalEvents(): Record<string, WeddingEvent> {
  try {
    const raw = localStorage.getItem(EVENTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalEvent(event: WeddingEvent): void {
  try {
    const events = getLocalEvents();
    events[event.slug] = event;
    events[event.id] = event;
    localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error('Failed to cache event locally:', err);
  }
}

function getLocalUploads(eventId: string): MemoryUpload[] {
  try {
    const raw = localStorage.getItem(`${UPLOADS_CACHE_KEY}_${eventId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalUploads(eventId: string, uploads: MemoryUpload[]): void {
  try {
    localStorage.setItem(`${UPLOADS_CACHE_KEY}_${eventId}`, JSON.stringify(uploads));
  } catch (err) {
    console.error('Failed to cache uploads locally:', err);
  }
}

/**
 * Fetch wedding event by slug or ID
 */
export async function fetchWeddingEvent(identifier: string): Promise<WeddingEvent> {
  const normalized = identifier.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    try {
      // Query by slug or by UUID if identifier looks like UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);
      const query = isUuid
        ? supabase.from('wedding_events').select('*').or(`slug.eq.${normalized},id.eq.${normalized}`).limit(1)
        : supabase.from('wedding_events').select('*').eq('slug', normalized).limit(1);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const event = data[0] as WeddingEvent;
        saveLocalEvent(event);
        return event;
      }
    } catch (err) {
      console.warn('Could not query Supabase wedding_events:', err);
    }
  }

  // Check local cache
  const cached = getLocalEvents()[normalized];
  if (cached) return cached;

  // Fallback default
  const fallback = {
    ...DEFAULT_FALLBACK_EVENT,
    slug: normalized || 'safiyya-sharrafuth',
  };
  saveLocalEvent(fallback);
  return fallback;
}

/**
 * Update wedding event configuration (for Host Dashboard)
 */
export async function updateWeddingEvent(
  id: string,
  updates: Partial<WeddingEvent>
): Promise<{ success: boolean; event?: WeddingEvent; error?: string }> {
  const updatedPayload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('wedding_events')
        .update(updatedPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.message && error.message.includes('live_display_enabled')) {
          const { live_display_enabled, ...fallbackPayload } = updatedPayload;
          const retry = await supabase.from('wedding_events').update(fallbackPayload).eq('id', id);
          if (!retry.error) {
            const cached = getLocalEvents()[id] || DEFAULT_FALLBACK_EVENT;
            const merged = { ...cached, ...updatedPayload };
            saveLocalEvent(merged);
            return { success: true, event: merged };
          }
        }
        return { success: false, error: error.message };
      }
      if (data) {
        saveLocalEvent(data as WeddingEvent);
        return { success: true, event: data as WeddingEvent };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Local fallback
  const cached = getLocalEvents()[id] || DEFAULT_FALLBACK_EVENT;
  const merged: WeddingEvent = { ...cached, ...updatedPayload };
  saveLocalEvent(merged);
  return { success: true, event: merged };
}

/**
 * Fetch approved public memories for a given event (Guest Gallery / Live display)
 */
export async function fetchApprovedMemories(eventId: string): Promise<MemoryUpload[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('memory_uploads')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_visible', true)
        .eq('is_deleted', false)
        .in('status', ['ready', 'uploaded'])
        .order('uploaded_at', { ascending: false });

      if (!error && data) {
        return data as MemoryUpload[];
      }
    } catch (err) {
      console.warn('Error fetching approved memories:', err);
    }
  }

  // Fallback to local uploads
  return getLocalUploads(eventId).filter(
    (u) => u.is_visible && !u.is_deleted && (u.status === 'ready' || u.status === 'uploaded')
  );
}

/**
 * Fetch all memories for the Host Dashboard (including pending, hidden)
 */
export async function fetchAllMemoriesForHost(eventId: string): Promise<MemoryUpload[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('memory_uploads')
        .select('*')
        .eq('event_id', eventId)
        .order('uploaded_at', { ascending: false });

      if (!error && data) {
        saveLocalUploads(eventId, data as MemoryUpload[]);
        return data as MemoryUpload[];
      }
    } catch (err) {
      console.warn('Error fetching all memories for host:', err);
    }
  }

  return getLocalUploads(eventId);
}

/**
 * Create a new memory upload record
 */
export async function createMemoryUploadRecord(
  payload: Omit<MemoryUpload, 'id' | 'created_at' | 'updated_at'>
): Promise<MemoryUpload> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID ? crypto.randomUUID() : `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const newRecord: MemoryUpload = {
    ...payload,
    id,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('memory_uploads')
        .insert({
          id,
          event_id: payload.event_id,
          invitee_id: payload.invitee_id || null,
          guest_name: payload.guest_name || null,
          original_filename: payload.original_filename,
          storage_key: payload.storage_key,
          media_type: payload.media_type,
          mime_type: payload.mime_type,
          file_size: payload.file_size,
          status: payload.status,
          is_visible: payload.is_visible,
          is_deleted: payload.is_deleted,
          thumbnail_key: payload.thumbnail_key || null,
          width: payload.width || null,
          height: payload.height || null,
          duration: payload.duration || null,
          checksum: payload.checksum || null,
          uploaded_at: payload.uploaded_at || now,
        });

      if (!error) {
        const current = getLocalUploads(payload.event_id);
        saveLocalUploads(payload.event_id, [newRecord, ...current]);
        return newRecord;
      } else {
        console.warn('Supabase insert returned error:', error);
      }
    } catch (err) {
      console.warn('Could not insert memory_uploads in Supabase:', err);
    }
  }

  // Local fallback
  const current = getLocalUploads(payload.event_id);
  saveLocalUploads(payload.event_id, [newRecord, ...current]);
  return newRecord;
}

/**
 * Update memory record status or moderation
 */
export async function updateMemoryUpload(
  id: string,
  eventId: string,
  updates: Partial<MemoryUpload>
): Promise<boolean> {
  const updatedPayload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('memory_uploads')
        .update(updatedPayload)
        .eq('id', id);

      if (!error) {
        const current = getLocalUploads(eventId);
        saveLocalUploads(
          eventId,
          current.map((item) => (item.id === id ? { ...item, ...updatedPayload } : item))
        );
        return true;
      }
    } catch (err) {
      console.warn('Error updating memory upload:', err);
    }
  }

  // Local fallback
  const current = getLocalUploads(eventId);
  saveLocalUploads(
    eventId,
    current.map((item) => (item.id === id ? { ...item, ...updatedPayload } : item))
  );
  return true;
}

/**
 * Bulk update memory moderation
 */
export async function bulkUpdateMemories(
  ids: string[],
  eventId: string,
  updates: Partial<MemoryUpload>
): Promise<boolean> {
  const updatedPayload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('memory_uploads')
        .update(updatedPayload)
        .in('id', ids);

      if (!error) {
        const idSet = new Set(ids);
        const current = getLocalUploads(eventId);
        saveLocalUploads(
          eventId,
          current.map((item) => (idSet.has(item.id) ? { ...item, ...updatedPayload } : item))
        );
        return true;
      }
    } catch (err) {
      console.warn('Error in bulk updating memories:', err);
    }
  }

  const idSet = new Set(ids);
  const current = getLocalUploads(eventId);
  saveLocalUploads(
    eventId,
    current.map((item) => (idSet.has(item.id) ? { ...item, ...updatedPayload } : item))
  );
}

/**
 * Permanently delete memory from Supabase and archive in Cloudflare R2
 */
export async function permanentlyDeleteMemory(
  uploadId: string,
  eventId: string,
  storageKey: string,
  originalFilename?: string
): Promise<{ success: boolean; archiveKey?: string; error?: string }> {
  try {
    const res = await fetch('/api/memories/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadId,
        eventId,
        storageKey,
        originalFilename,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.error || 'Failed to permanently delete memory' };
    }

    // Remove from local storage cache as well
    const current = getLocalUploads(eventId);
    saveLocalUploads(
      eventId,
      current.filter((item) => item.id !== uploadId)
    );

    return { success: true, archiveKey: data?.archiveKey };
  } catch (err: any) {
    console.error('permanentlyDeleteMemory error:', err);
    return { success: false, error: err.message || 'Network error deleting memory' };
  }
}

/**
 * Permanently delete multiple memories in bulk and archive them in Cloudflare R2
 */
export async function permanentlyDeleteMemoriesBulk(
  eventId: string,
  items: Array<{ uploadId: string; storageKey: string; originalFilename?: string }>
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const res = await fetch('/api/memories/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        items,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.error || 'Failed to permanently delete memories' };
    }

    const deletedIds = new Set(items.map((it) => it.uploadId));
    const current = getLocalUploads(eventId);
    saveLocalUploads(
      eventId,
      current.filter((item) => !deletedIds.has(item.id))
    );

    return { success: true, deletedCount: data?.deletedCount || items.length };
  } catch (err: any) {
    console.error('permanentlyDeleteMemoriesBulk error:', err);
    return { success: false, error: err.message || 'Network error deleting memories' };
  }
}

/**
 * Compute statistics for host dashboard
 */
export function computeMemoriesStats(uploads: MemoryUpload[]): MemoriesStats {
  const activeUploads = uploads.filter((u) => !u.is_deleted);
  const today = new Date().toDateString();

  let totalPhotos = 0;
  let totalVideos = 0;
  let totalStorageBytes = 0;
  let uploadsToday = 0;
  let pendingModeration = 0;
  let hiddenCount = 0;
  const contributors = new Set<string>();

  for (const item of activeUploads) {
    if (item.media_type === 'photo') totalPhotos++;
    else if (item.media_type === 'video') totalVideos++;

    totalStorageBytes += item.file_size || 0;

    if (item.uploaded_at && new Date(item.uploaded_at).toDateString() === today) {
      uploadsToday++;
    }

    if (item.status === 'pending') {
      pendingModeration++;
    }

    if (!item.is_visible) {
      hiddenCount++;
    }

    if (item.guest_name && item.guest_name.trim().length > 0) {
      contributors.add(item.guest_name.trim().toLowerCase());
    }
  }

  return {
    totalUploads: activeUploads.length,
    totalPhotos,
    totalVideos,
    totalStorageBytes,
    uniqueContributors: contributors.size,
    uploadsToday,
    pendingModeration,
    hiddenCount,
  };
}

/**
 * Format bytes nicely (e.g. 14.5 MB, 1.2 GB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Resolve display or download URL for a memory item
 */
export function resolveMediaUrl(item: MemoryUpload, download = false): string {
  if (item.url) return item.url;

  const publicDomain = (import.meta as any).env?.VITE_R2_PUBLIC_DOMAIN;
  if (publicDomain && !download) {
    const cleanDomain = publicDomain.replace(/\/+$/, '');
    return `${cleanDomain}/${encodeURI(item.storage_key)}`;
  }

  return `/api/memories/media-url?key=${encodeURIComponent(item.storage_key)}${
    download ? `&download=true&filename=${encodeURIComponent(item.original_filename)}` : ''
  }`;
}

