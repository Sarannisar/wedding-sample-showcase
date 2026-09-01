CREATE TABLE public.invitee_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invitee_id uuid NOT NULL REFERENCES public.invitees(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('created','sent','opened','responded')),
  meta text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.invitee_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitee_events TO authenticated;
GRANT ALL ON public.invitee_events TO service_role;

ALTER TABLE public.invitee_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read invitee events" ON public.invitee_events FOR SELECT USING (true);
CREATE POLICY "Public insert invitee events" ON public.invitee_events FOR INSERT WITH CHECK (true);

CREATE INDEX idx_invitee_events_invitee_created ON public.invitee_events (invitee_id, created_at DESC);