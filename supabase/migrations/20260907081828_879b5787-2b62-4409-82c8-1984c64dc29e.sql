ALTER TABLE public.invitees
  ADD COLUMN IF NOT EXISTS first_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS shared_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminded_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;

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