-- =========================================================================
-- COMPLETE SUPABASE DATABASE SETUP FOR SAFIYYA & SHARRAFUTH WEDDING APP
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jrzdhsteifzkgvmwkdwt/sql
-- =========================================================================

-- 1. Ensure extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Create or update public.invitees table
create table if not exists public.invitees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  phone text,
  rsvp text not null default 'pending' check (rsvp in ('pending', 'attending', 'declined')),
  guest_count integer not null default 1,
  notes text,
  responded_at timestamptz,
  shared_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz default now()
);

-- Ensure all columns exist if table was created previously with fewer columns
alter table public.invitees add column if not exists phone text;
alter table public.invitees add column if not exists rsvp text not null default 'pending';
alter table public.invitees add column if not exists guest_count integer not null default 1;
alter table public.invitees add column if not exists notes text;
alter table public.invitees add column if not exists responded_at timestamptz;
alter table public.invitees add column if not exists shared_at timestamptz;
alter table public.invitees add column if not exists opened_at timestamptz;
alter table public.invitees add column if not exists created_at timestamptz default now();

-- 3. Create public.invitee_events table (Activity Trail & Analytics)
create table if not exists public.invitee_events (
  id uuid primary key default gen_random_uuid(),
  invitee_id uuid not null references public.invitees(id) on delete cascade,
  type text not null,
  created_at timestamptz default now()
);

-- Ensure check constraint on invitee_events
alter table public.invitee_events drop constraint if exists invitee_events_type_check;
alter table public.invitee_events
  add constraint invitee_events_type_check
  check (type in ('created', 'sent', 'opened', 'responded', 'rsvp_submitted', 'calendar_added', 'maps_opened'));

-- 4. Create Indexes for High Performance
create index if not exists idx_invitees_slug on public.invitees(slug);
create index if not exists idx_invitees_rsvp on public.invitees(rsvp);
create index if not exists idx_invitees_created_at on public.invitees(created_at desc);
create index if not exists idx_invitee_events_invitee_id on public.invitee_events(invitee_id, created_at desc);

-- 5. Permissions & Grants
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.invitees to anon, authenticated;
grant all on public.invitees to service_role;

grant select, insert on public.invitee_events to anon, authenticated;
grant all on public.invitee_events to service_role;

-- 6. Row Level Security (RLS) & Policies
alter table public.invitees enable row level security;
alter table public.invitee_events enable row level security;

-- Policies for public.invitees
drop policy if exists "Allow public access to invitees" on public.invitees;
create policy "Allow public access to invitees"
  on public.invitees for all
  using (true)
  with check (true);

-- Policies for public.invitee_events
drop policy if exists "Allow select on invitee_events" on public.invitee_events;
create policy "Allow select on invitee_events"
  on public.invitee_events for select
  using (true);

drop policy if exists "Allow insert on invitee_events" on public.invitee_events;
create policy "Allow insert on invitee_events"
  on public.invitee_events for insert
  with check (true);

-- 7. Realtime Replication Publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'invitees'
  ) then
    alter publication supabase_realtime add table public.invitees;
  end if;
end $$;
