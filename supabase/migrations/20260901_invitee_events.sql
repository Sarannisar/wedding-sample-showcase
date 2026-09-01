-- Migration: Create invitee_events table for activity trail
create table if not exists public.invitee_events (
  id uuid primary key default gen_random_uuid(),
  invitee_id uuid references public.invitees(id) on delete cascade,
  type text not null check (type in ('created', 'sent', 'opened', 'responded')),
  created_at timestamptz default now()
);

grant select, insert on public.invitee_events to anon, authenticated;
grant all on public.invitee_events to service_role;

alter table public.invitee_events enable row level security;

drop policy if exists "Allow anon and authenticated to select invitee_events" on public.invitee_events;
create policy "Allow anon and authenticated to select invitee_events"
  on public.invitee_events for select
  using (true);

drop policy if exists "Allow anon and authenticated to insert invitee_events" on public.invitee_events;
create policy "Allow anon and authenticated to insert invitee_events"
  on public.invitee_events for insert
  with check (true);

create index if not exists idx_invitee_events_invitee_id_created_at
  on public.invitee_events (invitee_id, created_at desc);
