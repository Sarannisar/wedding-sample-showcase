-- =========================================================================
-- REMEDIATION: REVOKE ANONYMOUS INSERT ON PUBLIC.INVITEES (FIND-SEC-24-01)
-- Prevents unauthenticated clients from creating arbitrary guest records
-- via direct PostgREST calls (POST /rest/v1/invitees).
-- =========================================================================

-- Drop the legacy public insert policy
DROP POLICY IF EXISTS "Public insert invitees" ON public.invitees;

-- Revoke direct table-level INSERT privilege from anonymous clients
REVOKE INSERT ON public.invitees FROM anon;
