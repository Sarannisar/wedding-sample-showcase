-- =========================================================================
-- SECURITY REMEDIATION MIGRATION: RLS HARDENING & GUEST DATA ISOLATION
-- Date: 2026-10-08
-- Vulnerabilities addressed: SEC-24-02 (PII scrape via RLS), SEC-24-03 (BOLA RSVP manipulation)
-- =========================================================================

-- 1. Ensure Row Level Security is active
ALTER TABLE IF EXISTS public.invitees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invitee_events ENABLE ROW LEVEL SECURITY;

-- 2. Drop vulnerable policies on public.invitees
DROP POLICY IF EXISTS "Public read invitees" ON public.invitees;
DROP POLICY IF EXISTS "Public read invitees by slug" ON public.invitees;
DROP POLICY IF EXISTS "Public update own invitee" ON public.invitees;
DROP POLICY IF EXISTS "Allow public access to invitees" ON public.invitees;

-- 3. Ensure Hosts/Admins retain full access when authenticated
DROP POLICY IF EXISTS "Admins full access to invitees" ON public.invitees;
CREATE POLICY "Admins full access to invitees"
  ON public.invitees
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure service_role has complete access
GRANT ALL ON public.invitees TO service_role;
GRANT ALL ON public.invitees TO authenticated;

-- Revoke direct anonymous SELECT, UPDATE, and DELETE on public.invitees table
-- (Anonymous guests must access via secure RPC functions below)
REVOKE SELECT, UPDATE, DELETE ON public.invitees FROM anon;

-- 4. Harden public.invitee_events table
DROP POLICY IF EXISTS "Public read invitee_events" ON public.invitee_events;
DROP POLICY IF EXISTS "Allow select on invitee_events" ON public.invitee_events;
REVOKE SELECT ON public.invitee_events FROM anon;

DROP POLICY IF EXISTS "Admins full access to invitee_events" ON public.invitee_events;
CREATE POLICY "Admins full access to invitee_events"
  ON public.invitee_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.invitee_events TO service_role;
GRANT ALL ON public.invitee_events TO authenticated;

-- Allow anonymous clients to insert activity tracking events
DROP POLICY IF EXISTS "Public insert invitee_events" ON public.invitee_events;
CREATE POLICY "Public insert invitee_events"
  ON public.invitee_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
GRANT INSERT ON public.invitee_events TO anon;

-- 5. Data Integrity: Enforce valid guest count bounds (0 to 20 guests per invitee)
ALTER TABLE public.invitees DROP CONSTRAINT IF EXISTS invitees_guest_count_range_check;
ALTER TABLE public.invitees
  ADD CONSTRAINT invitees_guest_count_range_check
  CHECK (guest_count >= 0 AND guest_count <= 20);

-- =========================================================================
-- SECURE STORED PROCEDURES (SECURITY DEFINER)
-- =========================================================================

-- Function 1: Fetch single invitee by exact slug without exposing other rows
CREATE OR REPLACE FUNCTION public.get_invitee_by_slug(p_slug text)
RETURNS SETOF public.invitees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.invitees
  WHERE lower(slug) = lower(trim(p_slug))
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitee_by_slug(text) TO anon, authenticated;

-- Function 2: Submit guest RSVP with server-side validation and atomic update
CREATE OR REPLACE FUNCTION public.submit_guest_rsvp(
  p_slug text,
  p_rsvp text,
  p_guest_count int DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS SETOF public.invitees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitee public.invitees%ROWTYPE;
  v_responded_at timestamptz := now();
  v_clean_count int;
BEGIN
  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    RAISE EXCEPTION 'Invalid slug parameter';
  END IF;

  IF p_rsvp NOT IN ('attending', 'declined', 'pending') THEN
    RAISE EXCEPTION 'Invalid RSVP status: %', p_rsvp;
  END IF;

  v_clean_count := COALESCE(p_guest_count, 0);
  IF v_clean_count < 0 OR v_clean_count > 20 THEN
    RAISE EXCEPTION 'Guest count must be between 0 and 20';
  END IF;

  IF p_rsvp <> 'attending' THEN
    v_clean_count := 0;
  END IF;

  SELECT * INTO v_invitee
  FROM public.invitees
  WHERE lower(slug) = lower(trim(p_slug))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation record not found for slug: %', p_slug;
  END IF;

  UPDATE public.invitees
  SET
    rsvp = p_rsvp,
    guest_count = v_clean_count,
    notes = CASE WHEN p_notes IS NOT NULL THEN trim(p_notes) ELSE notes END,
    responded_at = v_responded_at
  WHERE id = v_invitee.id
  RETURNING * INTO v_invitee;

  RETURN NEXT v_invitee;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_guest_rsvp(text, text, int, text) TO anon, authenticated;

-- Function 3: Record invitee open timestamp safely
CREATE OR REPLACE FUNCTION public.record_invitee_opened(p_identifier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF p_identifier IS NULL OR trim(p_identifier) = '' THEN
    RETURN;
  END IF;

  UPDATE public.invitees
  SET
    opened_at = v_now,
    first_opened_at = COALESCE(first_opened_at, v_now)
  WHERE lower(slug) = lower(trim(p_identifier))
     OR id::text = trim(p_identifier);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_invitee_opened(text) TO anon, authenticated;
