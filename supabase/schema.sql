-- ============================================================
-- Wedding Guest App — Supabase Schema (multi-tenant)
-- Run this FIRST in Database → SQL Editor
-- ============================================================
--
-- ⚠ DESTRUCTIVE: the `drop table` block below will erase existing data.
-- Only run this on a fresh project, or one where you're OK reseeding
-- from seed.sql afterwards.
-- ============================================================

drop table if exists public.notification_replies   cascade;
drop table if exists public.notification_reactions cascade;
drop table if exists public.notifications         cascade;
drop table if exists public.packing_checklist     cascade;
drop table if exists public.song_requests         cascade;
drop table if exists public.guest_info            cascade;
drop table if exists public.wedding_admins        cascade;
drop table if exists public.guests                cascade;
drop table if exists public.weddings              cascade;


-- ─── weddings ────────────────────────────────────────────────────────────────
-- One row per wedding. Each tenant in the app is a wedding.
-- The "Neha & Naveen" demo wedding has a fixed UUID so that existing
-- `wedding_id` defaults below point at it during the rollout. Once PR 3
-- updates all app queries to pass `wedding_id` explicitly, those defaults
-- can be dropped.
create table public.weddings (
  id               uuid primary key default gen_random_uuid(),
  invite_code      text unique not null,
  couple_names     text not null,
  wedding_date     timestamptz not null,
  location         text not null,
  destination_city text not null,
  hashtag          text,
  website          text,
  contact_email    text,
  registry_url     text,
  hero_image_url   text,
  theme_color      text default '#8B5E6B',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);


-- ─── guests ──────────────────────────────────────────────────────────────────
-- The per-wedding guest list. Replaces constants/guests.ts at runtime.
-- Login validates the typed name against this table for the selected wedding.
create table public.guests (
  id                uuid primary key default gen_random_uuid(),
  wedding_id        uuid not null references public.weddings(id) on delete cascade,
  canonical_name    text not null,
  is_wedding_party  boolean not null default false,
  gender            text check (gender in ('male', 'female')),
  created_at        timestamptz default now(),
  unique (wedding_id, canonical_name)
);


-- ─── wedding_admins ──────────────────────────────────────────────────────────
-- Guests with admin access (send notifications, delete messages, etc.) for
-- a given wedding. Replaces the hardcoded adminNamePrefixes check.
create table public.wedding_admins (
  id         uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_name text not null,
  created_at timestamptz default now(),
  unique (wedding_id, guest_name)
);


-- ─── guest_info ──────────────────────────────────────────────────────────────
-- Per-guest RSVP + travel info.
-- `guest_name` stays globally unique for now so existing app upserts keyed on
-- `guest_name` keep working. PR 3 will drop that constraint and replace it
-- with a (wedding_id, guest_name) composite once every query passes wedding_id.
create table public.guest_info (
  id               uuid primary key default gen_random_uuid(),
  wedding_id       uuid not null references public.weddings(id) on delete cascade
                   default '00000000-0000-0000-0000-000000000001',
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
  phone            text default '',
  email            text default '',
  push_token       text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);


-- ─── song_requests ───────────────────────────────────────────────────────────
create table public.song_requests (
  id           uuid primary key default gen_random_uuid(),
  wedding_id   uuid not null references public.weddings(id) on delete cascade
               default '00000000-0000-0000-0000-000000000001',
  song         text not null,
  artist       text default '',
  requested_by text not null,
  submitted_at timestamptz default now()
);


-- ─── notifications ───────────────────────────────────────────────────────────
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade
             default '00000000-0000-0000-0000-000000000001',
  message    text not null,
  sender     text not null,
  sent_at    timestamptz default now()
);


-- ─── notification_reactions ──────────────────────────────────────────────────
create table public.notification_reactions (
  id              uuid primary key default gen_random_uuid(),
  wedding_id      uuid not null references public.weddings(id) on delete cascade
                  default '00000000-0000-0000-0000-000000000001',
  notification_id uuid not null references public.notifications(id) on delete cascade,
  guest_name      text not null,
  emoji           text not null,
  created_at      timestamptz default now(),
  unique (notification_id, guest_name)
);


-- ─── notification_replies ────────────────────────────────────────────────────
create table public.notification_replies (
  id              uuid primary key default gen_random_uuid(),
  wedding_id      uuid not null references public.weddings(id) on delete cascade
                  default '00000000-0000-0000-0000-000000000001',
  notification_id uuid not null references public.notifications(id) on delete cascade,
  guest_name      text not null,
  message         text not null,
  created_at      timestamptz default now()
);


-- ─── packing_checklist ───────────────────────────────────────────────────────
-- `guest_name` stays as the primary key for now so existing upserts keyed on
-- it keep working. PR 3 will migrate this to a (wedding_id, guest_name) PK.
create table public.packing_checklist (
  guest_name    text primary key,
  wedding_id    uuid not null references public.weddings(id) on delete cascade
                default '00000000-0000-0000-0000-000000000001',
  checked_items text[] not null default '{}',
  updated_at    timestamptz not null default now()
);


-- ─── Row Level Security ──────────────────────────────────────────────────────
-- Guest identity is handled at the application layer (AsyncStorage-backed
-- guest name). Policies stay permissive until PR 3 introduces Supabase Auth;
-- at that point they'll be scoped per wedding.

alter table public.weddings               enable row level security;
alter table public.guests                 enable row level security;
alter table public.wedding_admins         enable row level security;
alter table public.guest_info             enable row level security;
alter table public.song_requests          enable row level security;
alter table public.notifications          enable row level security;
alter table public.notification_reactions enable row level security;
alter table public.notification_replies   enable row level security;
alter table public.packing_checklist      enable row level security;

create policy "allow_all_weddings"               on public.weddings               for all using (true) with check (true);
create policy "allow_all_guests"                 on public.guests                 for all using (true) with check (true);
create policy "allow_all_wedding_admins"         on public.wedding_admins         for all using (true) with check (true);
create policy "allow_all_guest_info"             on public.guest_info             for all using (true) with check (true);
create policy "allow_all_song_requests"          on public.song_requests          for all using (true) with check (true);
create policy "allow_all_notifications"          on public.notifications          for all using (true) with check (true);
create policy "allow_all_notification_reactions" on public.notification_reactions for all using (true) with check (true);
create policy "allow_all_notification_replies"   on public.notification_replies   for all using (true) with check (true);
create policy "allow_all_packing_checklist"      on public.packing_checklist      for all using (true) with check (true);
