-- ============================================================
-- Tetherly — SaaS Supabase Schema
-- Paste this into the new SaaS project's SQL Editor and run once.
-- ============================================================
--
-- This schema is for the fresh SaaS Supabase project that backs the
-- multi-tenant "Tetherly" build (separate App Store app from
-- the Neha & Naveen unlisted submission).
--
-- Differences from supabase/schema.sql:
--   • wedding_id is the first data column on every child table (right
--     after the primary key), not the last.
--   • No default wedding_id values — every insert must pass wedding_id
--     explicitly.
--   • Composite uniqueness keys: (wedding_id, guest_name) on guest_info,
--     (wedding_id, guest_name) PK on packing_checklist,
--     (wedding_id, notification_id, guest_name) on notification_reactions.
--   • No seed data. Weddings are provisioned out-of-band.
--
-- Safe to run on a fresh project. Wrapped in a transaction so a partial
-- failure leaves the schema untouched.
-- ============================================================

begin;


-- ─── weddings ────────────────────────────────────────────────────────────────
-- One row per wedding. Each tenant in the app is a wedding, identified to
-- guests via `invite_code`.
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
-- The per-wedding guest list. Login validates the typed name against this
-- table for the selected wedding.
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
-- Users with admin access (send notifications, etc.) for a given wedding.
-- Admins are independent of the guest list — e.g. a wedding planner is an
-- admin but typically not a guest, so login validates the typed name against
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
  -- Vendor roles like 'dj' are login-only: scoped schedule visibility,
  -- no admin-ui surfaces. Expand the check list as new vendors are added.
  role             text check (role in ('planner', 'dj')),
  created_at       timestamptz default now(),
  unique (wedding_id, guest_name)
);


-- ─── guest_info ──────────────────────────────────────────────────────────────
-- Per-guest RSVP + travel info. Uniqueness is composite (wedding_id, guest_name)
-- so the same guest name can appear in two different weddings.
create table public.guest_info (
  id               uuid primary key default gen_random_uuid(),
  wedding_id       uuid not null references public.weddings(id) on delete cascade,
  guest_name       text not null,
  -- Pre-collected (read-only in app, set during wedding provisioning)
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
  updated_at       timestamptz default now(),
  unique (wedding_id, guest_name)
);


-- ─── song_requests ───────────────────────────────────────────────────────────
create table public.song_requests (
  id           uuid primary key default gen_random_uuid(),
  wedding_id   uuid not null references public.weddings(id) on delete cascade,
  song         text not null,
  artist       text default '',
  requested_by text not null,
  submitted_at timestamptz default now()
);


-- ─── notifications ───────────────────────────────────────────────────────────
create table public.notifications (
  id                 uuid primary key default gen_random_uuid(),
  wedding_id         uuid not null references public.weddings(id) on delete cascade,
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
  wedding_id      uuid not null references public.weddings(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  guest_name      text not null,
  emoji           text not null,
  created_at      timestamptz default now(),
  unique (wedding_id, notification_id, guest_name)
);


-- ─── notification_replies ────────────────────────────────────────────────────
create table public.notification_replies (
  id              uuid primary key default gen_random_uuid(),
  wedding_id      uuid not null references public.weddings(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  guest_name      text not null,
  message         text not null,
  created_at      timestamptz default now()
);


-- ─── packing_checklist ───────────────────────────────────────────────────────
-- Composite primary key: each guest has one checklist per wedding.
create table public.packing_checklist (
  wedding_id    uuid not null references public.weddings(id) on delete cascade,
  guest_name    text not null,
  checked_items text[] not null default '{}',
  updated_at    timestamptz not null default now(),
  primary key (wedding_id, guest_name)
);


-- ─── Row Level Security ──────────────────────────────────────────────────────
-- Guest identity is handled at the application layer (AsyncStorage-backed
-- guest name) for now. Policies stay permissive until auth is introduced;
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


commit;
