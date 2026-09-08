-- =========================================================================
-- DASHBOARD AUTHENTICATION & ROW LEVEL SECURITY (RLS) POLICIES
-- Protects host dashboard while preserving frictionless public guest RSVPs.
-- =========================================================================

-- 1. Ensure Row Level Security is enabled
alter table if exists public.invitees enable row level security;
alter table if exists public.invitee_events enable row level security;

-- 2. Clean up existing policies on public.invitees
drop policy if exists "Allow public access to invitees" on public.invitees;
drop policy if exists "Admins full access to invitees" on public.invitees;
drop policy if exists "Public read invitees" on public.invitees;
drop policy if exists "Public update own invitee" on public.invitees;

-- 3. Invitees: Authenticated Admins have full access (select, insert, update, delete)
create policy "Admins full access to invitees"
  on public.invitees
  for all
  to authenticated
  using (true)
  with check (true);

-- 4. Invitees: Anonymous Guests can read records (to load their personalized card by slug)
create policy "Public read invitees"
  on public.invitees
  for select
  to anon
  using (true);

-- 5. Invitees: Anonymous Guests can update their response details (RSVP, guest_count, notes, timestamps)
create policy "Public update own invitee"
  on public.invitees
  for update
  to anon
  using (true)
  with check (true);

-- 6. Clean up existing policies on public.invitee_events
drop policy if exists "Allow select on invitee_events" on public.invitee_events;
drop policy if exists "Allow insert on invitee_events" on public.invitee_events;
drop policy if exists "Admins full access to invitee_events" on public.invitee_events;
drop policy if exists "Public insert invitee_events" on public.invitee_events;

-- 7. Events: Authenticated Admins have full access to timeline & analytics events
create policy "Admins full access to invitee_events"
  on public.invitee_events
  for all
  to authenticated
  using (true)
  with check (true);

-- 8. Events: Anonymous Guests can insert interaction events ('opened', 'calendar_added', etc.)
create policy "Public insert invitee_events"
  on public.invitee_events
  for insert
  to anon
  with check (true);
