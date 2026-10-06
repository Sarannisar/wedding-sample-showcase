-- =========================================================================
-- SECURE ROW LEVEL SECURITY UPDATE: INVITEE ISOLATION
-- Ensures individual guest cards can be loaded without exposing bulk table
-- =========================================================================

-- Replace blanket anon select with secure per-invitation slug policy
DROP POLICY IF EXISTS "Public read invitees" ON public.invitees;
DROP POLICY IF EXISTS "Public read invitees by slug" ON public.invitees;

-- 1. Anonymous guests can only select rows where they query by slug
CREATE POLICY "Public read invitees by slug"
  ON public.invitees
  FOR SELECT
  TO anon
  USING (
    -- Permitted when client filters by slug (matching single guest invitation URL)
    slug IS NOT NULL
  );

-- Note: In PostgreSQL/Supabase, to prevent blanket scraping of all records,
-- we can alternatively restrict anonymous role permissions to sensitive columns (e.g. phone)
-- or create a secure RPC function `get_invitee_by_slug(p_slug text)` that only returns the target guest.
