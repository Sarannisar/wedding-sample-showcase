-- =========================================================================
-- ROUND 3 SCHEMA MIGRATION: REMINDERS, OPEN ANCHORS, AND EVENT PERMISSIONS
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jrzdhsteifzkgvmwkdwt/sql
-- =========================================================================

-- 1. Extend invitees with reminder tracking and deadline anchors
ALTER TABLE public.invitees
  ADD COLUMN IF NOT EXISTS reminded_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shared_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_opened_at timestamptz;

-- 2. Update invitee_events check constraint to include 'reminded'
ALTER TABLE public.invitee_events DROP CONSTRAINT IF EXISTS invitee_events_type_check;
ALTER TABLE public.invitee_events
  ADD CONSTRAINT invitee_events_type_check
  CHECK (type IN ('created', 'sent', 'opened', 'responded', 'rsvp_submitted', 'calendar_added', 'maps_opened', 'reminded'));

-- 3. Ensure permissions and grants are complete
GRANT SELECT, INSERT ON public.invitee_events TO anon, authenticated;
GRANT ALL ON public.invitee_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitees TO anon, authenticated;
GRANT ALL ON public.invitees TO service_role;

-- 4. Create performance indexes on new query paths
CREATE INDEX IF NOT EXISTS idx_invitees_first_opened_at ON public.invitees(first_opened_at);
CREATE INDEX IF NOT EXISTS idx_invitees_reminded_at ON public.invitees(reminded_at);
