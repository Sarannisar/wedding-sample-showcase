-- Migration: RLS, Grants and Events Expansion (2026-09-02)
-- Enables full support for expanded event logging and guarantees table grants

-- 1. Ensure opened_at column exists on public.invitees
alter table if exists public.invitees
  add column if not exists opened_at timestamptz;

-- 2. Expand check constraint on public.invitee_events to accommodate all client analytics
alter table if exists public.invitee_events
  drop constraint if exists invitee_events_type_check;

alter table if exists public.invitee_events
  add constraint invitee_events_type_check
  check (type in ('created', 'sent', 'opened', 'responded', 'rsvp_submitted', 'calendar_added', 'maps_opened'));

-- 3. Ensure Table Grants for public.invitees
grant select, insert, update, delete on public.invitees to anon, authenticated;
grant all on public.invitees to service_role;

-- 4. Ensure Row Level Security and Policies on public.invitees
alter table public.invitees enable row level security;

drop policy if exists "Allow public access to invitees" on public.invitees;
create policy "Allow public access to invitees"
  on public.invitees for all
  using (true)
  with check (true);

-- 5. Ensure Table Grants and Policies for public.invitee_events
grant select, insert on public.invitee_events to anon, authenticated;
grant all on public.invitee_events to service_role;

alter table if exists public.invitee_events enable row level security;

drop policy if exists "Allow anon and authenticated to select invitee_events" on public.invitee_events;
create policy "Allow anon and authenticated to select invitee_events"
  on public.invitee_events for select
  using (true);

drop policy if exists "Allow anon and authenticated to insert invitee_events" on public.invitee_events;
create policy "Allow anon and authenticated to insert invitee_events"
  on public.invitee_events for insert
  with check (true);
