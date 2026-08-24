CREATE TABLE public.invitees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  phone text,
  rsvp text NOT NULL DEFAULT 'pending' CHECK (rsvp IN ('pending','attending','declined')),
  guest_count integer NOT NULL DEFAULT 0,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invitees_slug_idx ON public.invitees(slug);
CREATE INDEX invitees_rsvp_idx ON public.invitees(rsvp);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitees TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitees TO authenticated;
GRANT ALL ON public.invitees TO service_role;
ALTER TABLE public.invitees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read invitees" ON public.invitees FOR SELECT USING (true);
CREATE POLICY "Public insert invitees" ON public.invitees FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update invitees" ON public.invitees FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete invitees" ON public.invitees FOR DELETE USING (true);