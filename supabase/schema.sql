-- ============================================================
-- Wedding Guest App — Supabase Schema (multi-tenant)
-- Run this FIRST in Database → SQL Editor
-- ============================================================
--
-- ⚠ DESTRUCTIVE: the `drop table` block below will erase existing data.
-- Only run this on a fresh project, or one where you're OK reseeding
-- from seed.sql afterwards.
--
-- ⚠ DO NOT run this against the live Neha & Naveen Supabase project.
-- That project holds real RSVP / hotel / flight data guests have entered
-- and must stay on its current (pre-multi-tenant) schema through the
-- wedding. This schema is for a new Supabase project that will back the
-- generalized/SaaS build, where N&N is reseeded as a demo wedding.
-- ============================================================

drop table if exists public.ai_questions          cascade;
drop table if exists public.notification_replies   cascade;
drop table if exists public.notification_reactions cascade;
drop table if exists public.notifications         cascade;
drop table if exists public.packing_checklist     cascade;
drop table if exists public.event_time_overrides  cascade;
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
  -- Per-wedding planner name. Used in the Admin tab and supplied to
  -- the AI assistant so it can refer to the planner accurately.
  planner_name     text,
  -- Public URL for the wedding's shared photo album (Google Photos by
  -- default). Surfaced on the Photos tab and to the AI assistant so it
  -- can direct guests to the right place when asked about sharing photos.
  photo_album_url  text,
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
  -- Bridal party = bridesmaids/bridesman, a subset of the wedding party
  -- with extra packing items (e.g. matching sweatshirts, getting-ready
  -- outfits). Always implies is_wedding_party=true; enforced by seeding.
  is_bridal_party   boolean not null default false,
  gender            text check (gender in ('male', 'female')),
  created_at        timestamptz default now(),
  unique (wedding_id, canonical_name)
);


-- ─── wedding_admins ──────────────────────────────────────────────────────────
-- Users with admin access (send notifications, delete messages, etc.) for a
-- given wedding. Replaces the hardcoded adminNamePrefixes check. Admins are
-- independent of the guest list — e.g. a wedding planner is an admin but
-- typically not a guest, so login validates the typed name against
-- (guests ∪ wedding_admins) for the selected wedding.
create table public.wedding_admins (
  id               uuid primary key default gen_random_uuid(),
  wedding_id       uuid not null references public.weddings(id) on delete cascade,
  guest_name       text not null,
  -- Optional per-admin gating used when the admin isn't in the guest
  -- list (e.g. wedding planner, DJ). When the admin IS in public.guests,
  -- the app reads wedding-party + gender from guests first and these
  -- columns are ignored.
  is_wedding_party boolean not null default false,
  gender           text check (gender in ('male', 'female')),
  -- Optional role. Admins without a role (or role='planner') get full
  -- admin powers (send notifications, delete messages, admin page).
  -- Vendor roles ('dj', 'makeup_artist') are login-only: no admin-ui
  -- surfaces. Expand the check list as new vendors are added.
  role             text check (role in ('planner', 'dj', 'makeup_artist')),
  created_at       timestamptz default now(),
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
  id                 uuid primary key default gen_random_uuid(),
  wedding_id         uuid not null references public.weddings(id) on delete cascade
                     default '00000000-0000-0000-0000-000000000001',
  message            text not null,
  sender             text not null,
  -- When true the feed hides this message from non-wedding-party users
  -- and the send-push edge function only pushes to wedding-party guests.
  wedding_party_only boolean not null default false,
  sent_at            timestamptz default now()
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


-- ─── event_time_overrides ───────────────────────────────────────────────────
-- Lets admins override the `time` string on schedule events without a code
-- deploy. Events themselves stay defined in code; this table only stores
-- the overridden `time` per (wedding_id, event_id). The schedule screen
-- merges at render time: override wins if present, else event.time.
create table public.event_time_overrides (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  event_id    text not null,
  time        text not null,
  updated_at  timestamptz not null default now(),
  unique (wedding_id, event_id)
);


-- ─── packing_checklist ───────────────────────────────────────────────────────
-- `guest_name` stays as the primary key for now so existing upserts keyed on
-- it keep working. PR 3 will migrate this to a (wedding_id, guest_name) PK.
create table public.packing_checklist (
  guest_name    text primary key,
  wedding_id    uuid not null references public.weddings(id) on delete cascade
                default '00000000-0000-0000-0000-000000000001',
  checked_items text[] not null default '{}',
  -- Per-guest personal additions to the packing list, alongside the
  -- built-in items defined in code. Each entry is {id, label}.
  custom_items  jsonb not null default '[]'::jsonb,
  updated_at    timestamptz not null default now()
);


-- ─── ai_questions ────────────────────────────────────────────────────────────
-- Backs the floating "Ask" assistant. Every question + AI answer is logged
-- per (wedding_id, guest_name) so the chat modal can show prior threads,
-- and so the couple has a record of what guests are actually asking.
-- `tab_context` records which screen the question came from for analytics.
create table public.ai_questions (
  id            uuid primary key default gen_random_uuid(),
  wedding_id    uuid not null references public.weddings(id) on delete cascade,
  guest_name    text not null,
  question      text not null,
  answer        text not null,
  tab_context   text,
  created_at    timestamptz not null default now()
);

create index ai_questions_wedding_guest_idx
  on public.ai_questions (wedding_id, guest_name, created_at desc);


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
alter table public.event_time_overrides   enable row level security;
alter table public.ai_questions           enable row level security;

create policy "allow_all_weddings"               on public.weddings               for all using (true) with check (true);
create policy "allow_all_guests"                 on public.guests                 for all using (true) with check (true);
create policy "allow_all_wedding_admins"         on public.wedding_admins         for all using (true) with check (true);
create policy "allow_all_guest_info"             on public.guest_info             for all using (true) with check (true);
create policy "allow_all_song_requests"          on public.song_requests          for all using (true) with check (true);
create policy "allow_all_notifications"          on public.notifications          for all using (true) with check (true);
create policy "allow_all_notification_reactions" on public.notification_reactions for all using (true) with check (true);
create policy "allow_all_notification_replies"   on public.notification_replies   for all using (true) with check (true);
create policy "allow_all_packing_checklist"      on public.packing_checklist      for all using (true) with check (true);
create policy "allow_all_event_time_overrides"   on public.event_time_overrides   for all using (true) with check (true);
create policy "allow_all_ai_questions"           on public.ai_questions           for all using (true) with check (true);
