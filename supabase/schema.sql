-- ============================================================
-- Wedding Guest App — Supabase Schema
-- Run this in the Supabase SQL editor (Database → SQL Editor)
-- ============================================================

-- guest_info: one row per guest, upserted when they save their details
create table public.guest_info (
  id           uuid default gen_random_uuid() primary key,
  guest_name   text unique not null,
  hotel        text default '',
  check_in     text default '',
  check_out    text default '',
  arrival_time text default '',
  flight_number text default '',
  dietary      text default '',
  song_request text default '',
  extra_notes  text default '',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- song_requests: one row per request, all guests can see all requests
create table public.song_requests (
  id           uuid default gen_random_uuid() primary key,
  song         text not null,
  artist       text default '',
  requested_by text not null,
  submitted_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.guest_info enable row level security;
alter table public.song_requests enable row level security;

-- Allow full access from the app (guest identity is handled in-app, not via Supabase Auth)
create policy "allow_all_guest_info" on public.guest_info
  for all using (true) with check (true);

create policy "allow_all_song_requests" on public.song_requests
  for all using (true) with check (true);
