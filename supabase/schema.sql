-- ============================================================
-- Wedding Guest App — Supabase Schema
-- Run this FIRST in Database → SQL Editor
-- ============================================================

-- guest_info: one row per guest with pre-collected and editable data
create table public.guest_info (
  id               uuid default gen_random_uuid() primary key,
  guest_name       text unique not null,
  -- Pre-collected (read-only in app, set by seed.sql)
  dietary          text default '',
  meal_1           text default '',
  meal_2           text default '',
  meal_3           text default '',
  rehearsal_dinner boolean default false,
  -- Editable by guest in app
  hotel            text default '',
  check_in         text default '',
  check_out        text default '',
  arrival_time     text default '',
  flight_number    text default '',
  extra_notes      text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- song_requests: one row per request, visible to all guests
create table public.song_requests (
  id           uuid default gen_random_uuid() primary key,
  song         text not null,
  artist       text default '',
  requested_by text not null,
  submitted_at timestamptz default now()
);

-- notifications: log of push notifications sent to all guests
create table public.notifications (
  id        uuid default gen_random_uuid() primary key,
  message   text not null,
  sender    text not null,
  sent_at   timestamptz default now()
);

-- packing_checklist: one row per guest, stores array of checked item IDs
create table public.packing_checklist (
  guest_name    text primary key,
  checked_items text[] not null default '{}',
  updated_at    timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.guest_info enable row level security;
alter table public.song_requests enable row level security;
alter table public.packing_checklist enable row level security;
alter table public.notifications enable row level security;

-- Allow full access from the app (guest identity handled in-app, not via Supabase Auth)
create policy "allow_all_guest_info" on public.guest_info
  for all using (true) with check (true);

create policy "allow_all_song_requests" on public.song_requests
  for all using (true) with check (true);

create policy "allow_all_packing_checklist" on public.packing_checklist
  for all using (true) with check (true);

create policy "allow_read_notifications" on public.notifications
  for select using (true);
