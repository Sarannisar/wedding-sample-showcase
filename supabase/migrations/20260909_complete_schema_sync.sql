-- =========================================================================
-- COMPLETE DATABASE SCHEMA SYNC FOR SAFIYYA & SHARRAFUTH WEDDING APP
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jrzdhsteifzkgvmwkdwt/sql (or your active project)
-- =========================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Ensure public.invitees table and all required columns exist with proper types and defaults
CREATE TABLE IF NOT EXISTS public.invitees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  phone text,
  rsvp text NOT NULL DEFAULT 'pending',
  guest_count integer NOT NULL DEFAULT 0,
  notes text,
  responded_at timestamptz,
  shared_at timestamptz,
  opened_at timestamptz,
  first_opened_at timestamptz,
  reminded_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Safely add any columns that may be missing on existing deployments
ALTER TABLE public.invitees ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.invitees ADD COLUMN IF NOT EXISTS rsvp text NOT NULL DEFAULT 'pending';
ALTER TABLE public.invitees ADD COLUMN IF NOT EXISTS guest_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.invitees ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.invitees ADD COLUMN IF NOT EXISTS responded_at timestamptz;
ALTER TABLE public.invitees ADD COLUMN IF NOT EXISTS shared_at timestamptz;
ALTER TABLE public.invitees ADD COLUMN IF NOT EXISTS opened_at timestamptz;
ALTER TABLE public.invitees ADD COLUMN IF NOT EXISTS first_opened_at timestamptz;
ALTER TABLE public.invitees ADD COLUMN IF NOT EXISTS reminded_at timestamptz;
ALTER TABLE public.invitees ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.invitees ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Ensure check constraint on invitees.rsvp
ALTER TABLE public.invitees DROP CONSTRAINT IF EXISTS invitees_rsvp_check;
ALTER TABLE public.invitees
  ADD CONSTRAINT invitees_rsvp_check
  CHECK (rsvp IN ('pending', 'attending', 'declined'));

-- Ensure check constraint on invitees.guest_count
ALTER TABLE public.invitees DROP CONSTRAINT IF EXISTS invitees_guest_count_check;
ALTER TABLE public.invitees
  ADD CONSTRAINT invitees_guest_count_check
  CHECK (guest_count >= 0);

-- 3. Ensure public.invitee_events table exists with all columns and constraints
CREATE TABLE IF NOT EXISTS public.invitee_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitee_id uuid NOT NULL REFERENCES public.invitees(id) ON DELETE CASCADE,
  type text NOT NULL,
  meta text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Safely add any columns that may be missing on existing deployments
ALTER TABLE public.invitee_events ADD COLUMN IF NOT EXISTS meta text;
ALTER TABLE public.invitee_events ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Update check constraint on invitee_events.type to support all application event types
ALTER TABLE public.invitee_events DROP CONSTRAINT IF EXISTS invitee_events_type_check;
ALTER TABLE public.invitee_events
  ADD CONSTRAINT invitee_events_type_check
  CHECK (type IN (
    'created',
    'sent',
    'opened',
    'responded',
    'rsvp_submitted',
    'calendar_added',
    'maps_opened',
    'reminded'
  ));

-- 4. High-performance indexes
CREATE INDEX IF NOT EXISTS idx_invitees_slug ON public.invitees(slug);
CREATE INDEX IF NOT EXISTS idx_invitees_rsvp ON public.invitees(rsvp);
CREATE INDEX IF NOT EXISTS idx_invitees_created_at ON public.invitees(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitees_first_opened_at ON public.invitees(first_opened_at);
CREATE INDEX IF NOT EXISTS idx_invitees_reminded_at ON public.invitees(reminded_at);
CREATE INDEX IF NOT EXISTS idx_invitee_events_invitee_id ON public.invitee_events(invitee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitee_events_type ON public.invitee_events(type);

-- 5. Role permissions & schema grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitees TO anon, authenticated;
GRANT ALL ON public.invitees TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitee_events TO anon, authenticated;
GRANT ALL ON public.invitee_events TO service_role;

-- 6. Row Level Security (RLS) policies
ALTER TABLE public.invitees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitee_events ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies on public.invitees
DROP POLICY IF EXISTS "Admins full access to invitees" ON public.invitees;
DROP POLICY IF EXISTS "Public read invitees" ON public.invitees;
DROP POLICY IF EXISTS "Public update own invitee" ON public.invitees;
DROP POLICY IF EXISTS "Public insert invitees" ON public.invitees;
DROP POLICY IF EXISTS "Allow public access to invitees" ON public.invitees;

-- Authenticated admins have full control
CREATE POLICY "Admins full access to invitees"
  ON public.invitees
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anonymous guests can read invitations (by slug)
CREATE POLICY "Public read invitees"
  ON public.invitees
  FOR SELECT
  TO anon
  USING (true);

-- Anonymous guests can submit/update their RSVP responses
CREATE POLICY "Public update own invitee"
  ON public.invitees
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Anonymous guests can create an RSVP record if unseeded
CREATE POLICY "Public insert invitees"
  ON public.invitees
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Clean up existing policies on public.invitee_events
DROP POLICY IF EXISTS "Admins full access to invitee_events" ON public.invitee_events;
DROP POLICY IF EXISTS "Public read invitee_events" ON public.invitee_events;
DROP POLICY IF EXISTS "Public insert invitee_events" ON public.invitee_events;
DROP POLICY IF EXISTS "Allow select on invitee_events" ON public.invitee_events;
DROP POLICY IF EXISTS "Allow insert on invitee_events" ON public.invitee_events;

-- Authenticated admins have full access to events
CREATE POLICY "Admins full access to invitee_events"
  ON public.invitee_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anonymous guests can view event timeline if needed
CREATE POLICY "Public read invitee_events"
  ON public.invitee_events
  FOR SELECT
  TO anon
  USING (true);

-- Anonymous guests can log activity events (opened, responded, calendar_added, etc.)
CREATE POLICY "Public insert invitee_events"
  ON public.invitee_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 7. RSVP Deadline Enforcement Function & Trigger
CREATE OR REPLACE FUNCTION public.enforce_rsvp_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  event_time    timestamptz := timestamptz '2026-12-12 12:30:00+05:30';
  standard_dl   timestamptz;
  late_dl       timestamptz;
  anchor        timestamptz;
  effective_dl  timestamptz;
BEGIN
  -- If response values didn't change (e.g. only opened_at/shared_at changed), allow it
  IF NEW.rsvp IS NOT DISTINCT FROM OLD.rsvp
     AND NEW.guest_count IS NOT DISTINCT FROM OLD.guest_count
     AND NEW.notes IS NOT DISTINCT FROM OLD.notes THEN
    RETURN NEW;
  END IF;

  standard_dl := event_time - interval '7 days';
  late_dl     := event_time - interval '1 day';
  anchor      := COALESCE(OLD.first_opened_at, OLD.created_at, now());
  effective_dl := CASE WHEN anchor >= standard_dl THEN late_dl ELSE standard_dl END;

  IF now() > effective_dl THEN
    RAISE EXCEPTION 'RSVP is now closed. Please contact the family directly for any changes.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_rsvp_deadline ON public.invitees;
CREATE TRIGGER trg_enforce_rsvp_deadline
BEFORE UPDATE ON public.invitees
FOR EACH ROW EXECUTE FUNCTION public.enforce_rsvp_deadline();

-- 8. Realtime Replication & Full Replica Identity
ALTER TABLE public.invitees REPLICA IDENTITY FULL;
ALTER TABLE public.invitee_events REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'invitees'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invitees;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'invitee_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invitee_events;
  END IF;
END $$;
