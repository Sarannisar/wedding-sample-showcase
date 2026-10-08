-- =========================================================================
-- SECURE PASSCODE VERIFICATION FUNCTION (FIND-SEC-26-01)
-- Allows anonymous guests to verify event passcodes without exposing
-- passcode_hash over the public PostgREST API.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.verify_event_passcode(
  p_event_id uuid,
  p_passcode text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_hash text;
  v_passcode_enabled boolean;
  v_computed_hash text;
BEGIN
  IF p_event_id IS NULL OR p_passcode IS NULL OR trim(p_passcode) = '' THEN
    RETURN false;
  END IF;

  SELECT passcode_enabled, passcode_hash
  INTO v_passcode_enabled, v_stored_hash
  FROM public.wedding_events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- If passcode is not enabled, access is permitted
  IF NOT v_passcode_enabled THEN
    RETURN true;
  END IF;

  IF v_stored_hash IS NULL OR trim(v_stored_hash) = '' THEN
    RETURN true;
  END IF;

  -- Compute SHA-256 hex digest of provided passcode
  v_computed_hash := encode(digest(trim(p_passcode), 'sha256'), 'hex');

  -- Match either SHA-256 hash or plaintext
  RETURN (v_stored_hash = v_computed_hash OR v_stored_hash = trim(p_passcode));
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_event_passcode(uuid, text) TO anon, authenticated;
