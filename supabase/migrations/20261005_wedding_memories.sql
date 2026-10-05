-- =========================================================================
-- WEDDING MEMORIES SCHEMA MIGRATION: GUEST PHOTO & VIDEO DROP
-- Supports multi-event architecture, secure guest uploads, moderation,
-- live display, and host downloads.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Wedding Events Table
CREATE TABLE IF NOT EXISTS public.wedding_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  event_date timestamptz,
  welcome_message text DEFAULT 'Share your favourite photos & videos from our special celebration!',
  upload_enabled boolean NOT NULL DEFAULT true,
  gallery_enabled boolean NOT NULL DEFAULT false,
  guest_downloads_enabled boolean NOT NULL DEFAULT false,
  moderation_enabled boolean NOT NULL DEFAULT false,
  passcode_enabled boolean NOT NULL DEFAULT false,
  passcode_hash text,
  photo_size_limit_mb integer NOT NULL DEFAULT 25,
  video_size_limit_mb integer NOT NULL DEFAULT 500,
  max_files_per_batch integer NOT NULL DEFAULT 100,
  allow_guest_name boolean NOT NULL DEFAULT true,
  upload_closing_at timestamptz,
  gallery_closing_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Safely add any columns if wedding_events existed prior
ALTER TABLE public.wedding_events ADD COLUMN IF NOT EXISTS photo_size_limit_mb integer NOT NULL DEFAULT 25;
ALTER TABLE public.wedding_events ADD COLUMN IF NOT EXISTS video_size_limit_mb integer NOT NULL DEFAULT 500;
ALTER TABLE public.wedding_events ADD COLUMN IF NOT EXISTS max_files_per_batch integer NOT NULL DEFAULT 100;
ALTER TABLE public.wedding_events ADD COLUMN IF NOT EXISTS allow_guest_name boolean NOT NULL DEFAULT true;
ALTER TABLE public.wedding_events ADD COLUMN IF NOT EXISTS upload_closing_at timestamptz;
ALTER TABLE public.wedding_events ADD COLUMN IF NOT EXISTS gallery_closing_at timestamptz;
ALTER TABLE public.wedding_events ADD COLUMN IF NOT EXISTS live_display_enabled boolean NOT NULL DEFAULT true;

-- 2. Memory Uploads Table
CREATE TABLE IF NOT EXISTS public.memory_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.wedding_events(id) ON DELETE CASCADE,
  invitee_id uuid REFERENCES public.invitees(id) ON DELETE SET NULL,
  guest_name text,
  original_filename text NOT NULL,
  storage_key text NOT NULL UNIQUE,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video')),
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'uploaded', 'processing', 'ready', 'failed', 'deleted')),
  is_visible boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  thumbnail_key text,
  width integer,
  height integer,
  duration numeric,
  checksum text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Memory Archive Jobs Table (For host "Download All" ZIP packages)
CREATE TABLE IF NOT EXISTS public.memory_archive_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.wedding_events(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  total_files integer NOT NULL DEFAULT 0,
  total_bytes bigint NOT NULL DEFAULT 0,
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- 4. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_wedding_events_slug ON public.wedding_events(slug);
CREATE INDEX IF NOT EXISTS idx_memory_uploads_event_id ON public.memory_uploads(event_id);
CREATE INDEX IF NOT EXISTS idx_memory_uploads_uploaded_at ON public.memory_uploads(event_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_uploads_guest_name ON public.memory_uploads(guest_name);
CREATE INDEX IF NOT EXISTS idx_memory_uploads_status ON public.memory_uploads(status);
CREATE INDEX IF NOT EXISTS idx_memory_uploads_media_type ON public.memory_uploads(media_type);
CREATE INDEX IF NOT EXISTS idx_memory_uploads_visibility ON public.memory_uploads(event_id, is_visible, is_deleted);
CREATE INDEX IF NOT EXISTS idx_memory_archive_jobs_event_id ON public.memory_archive_jobs(event_id, created_at DESC);

-- 5. Role Permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wedding_events TO anon, authenticated;
GRANT ALL ON public.wedding_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_uploads TO anon, authenticated;
GRANT ALL ON public.memory_uploads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_archive_jobs TO anon, authenticated;
GRANT ALL ON public.memory_archive_jobs TO service_role;

-- 6. Row Level Security
ALTER TABLE public.wedding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_archive_jobs ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "Admins full access to wedding_events" ON public.wedding_events;
DROP POLICY IF EXISTS "Public read active wedding_events" ON public.wedding_events;
DROP POLICY IF EXISTS "Admins full access to memory_uploads" ON public.memory_uploads;
DROP POLICY IF EXISTS "Public read approved memory_uploads" ON public.memory_uploads;
DROP POLICY IF EXISTS "Public insert memory_uploads" ON public.memory_uploads;
DROP POLICY IF EXISTS "Public update memory_uploads" ON public.memory_uploads;
DROP POLICY IF EXISTS "Admins full access to memory_archive_jobs" ON public.memory_archive_jobs;
DROP POLICY IF EXISTS "Public select memory_archive_jobs" ON public.memory_archive_jobs;

-- Policies for wedding_events
CREATE POLICY "Admins full access to wedding_events"
  ON public.wedding_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read active wedding_events"
  ON public.wedding_events
  FOR SELECT
  TO anon
  USING (true);

-- Policies for memory_uploads
CREATE POLICY "Admins full access to memory_uploads"
  ON public.memory_uploads
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read approved memory_uploads"
  ON public.memory_uploads
  FOR SELECT
  TO anon
  USING (
    is_visible = true 
    AND is_deleted = false 
    AND status IN ('ready', 'uploaded')
    AND EXISTS (
      SELECT 1 FROM public.wedding_events e
      WHERE e.id = memory_uploads.event_id
        AND e.gallery_enabled = true
    )
  );

CREATE POLICY "Public insert memory_uploads"
  ON public.memory_uploads
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wedding_events e
      WHERE e.id = memory_uploads.event_id
        AND e.upload_enabled = true
    )
  );

CREATE POLICY "Public update memory_uploads"
  ON public.memory_uploads
  FOR UPDATE
  TO anon
  USING (status IN ('pending', 'uploading'))
  WITH CHECK (true);

-- Policies for memory_archive_jobs
CREATE POLICY "Admins full access to memory_archive_jobs"
  ON public.memory_archive_jobs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Seed Initial Wedding Event
INSERT INTO public.wedding_events (
  name,
  slug,
  event_date,
  welcome_message,
  upload_enabled,
  gallery_enabled,
  guest_downloads_enabled,
  moderation_enabled,
  passcode_enabled
) VALUES 
(
  'Safiyya & Sharrafuth Wedding Celebration',
  'safiyya-sharrafuth',
  '2026-12-12T12:30:00+05:30',
  'Welcome! Capture and share your candid photos & videos from our wedding day. Thank you for celebrating with us!',
  true,
  false,
  false,
  false,
  false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  welcome_message = EXCLUDED.welcome_message;
