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
  -- Per-wedding planner name. Used in the Admin tab and supplied to
  -- the AI assistant so it can refer to the planner accurately.
  planner_name     text,
  -- Public URL for the wedding's shared photo album (Google Photos by
  -- default). Surfaced on the Photos tab and to the AI assistant so it
  -- can direct guests to the right place when asked about sharing photos.
  photo_album_url  text,
  -- Soft second-factor for the home-tab admin tools. Never SELECTed by
  -- the client; verified via the check_admin_password() RPC so the value
  -- doesn't leak through the public weddings lookup.
  admin_password   text,
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
  -- Bridal party = bridesmaids/bridesman, a subset of the wedding party
  -- with extra packing items (e.g. matching sweatshirts, getting-ready
  -- outfits). Always implies is_wedding_party=true; enforced by seeding.
  is_bridal_party   boolean not null default false,
  gender            text check (gender in ('male', 'female')),
  -- Optional grouping so the admin Guest Accommodations view can pair
  -- household members together (couples, families). Nullable; guests
  -- without a household_id render as solo cards.
  household_id      integer,
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
  -- Vendor roles ('dj', 'makeup_artist', 'henna_artist') are login-only:
  -- no admin-ui surfaces. Expand the check list as new vendors are added.
  role             text check (role in ('planner', 'dj', 'makeup_artist', 'henna_artist')),
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
  -- Public URL of an attached photo (in the `message-images` storage
  -- bucket). NULL for text-only messages.
  image_url          text,
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
  -- Per-guest personal additions to the packing list, alongside the
  -- built-in items defined in code. Each entry is {id, label}.
  custom_items  jsonb not null default '[]'::jsonb,
  updated_at    timestamptz not null default now(),
  primary key (wedding_id, guest_name)
);


-- ─── event_time_overrides ───────────────────────────────────────────────────
-- Lets admins override per-event text fields without a code deploy. Events
-- themselves stay defined in code; this table stores per-(wedding_id,
-- event_id) overrides for the user-editable fields. Every column except
-- (wedding_id, event_id) is nullable — NULL means "use the value defined
-- in code". The schedule screen merges at render time: an override wins
-- for any field set, code defaults fill in the rest.
--
-- Name is historical (originally time-only); rather than rename and churn
-- policies / call sites, treat it as the generic event-overrides table.
create table public.event_time_overrides (
  id                  uuid primary key default gen_random_uuid(),
  wedding_id          uuid not null references public.weddings(id) on delete cascade,
  event_id            text not null,
  title               text,
  event_date          text,
  time                text,
  venue               text,
  address             text,
  dress_code          text,
  description         text,
  notes               text,
  wedding_party_only  boolean,
  updated_at          timestamptz not null default now(),
  unique (wedding_id, event_id)
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


-- ─── henna_stations ──────────────────────────────────────────────────────────
-- Singleton per wedding: is_open gates the guest join-line card on the
-- home tab; any henna_artist login can flip it. display_name is the
-- optional label the guest side shows ("Henna with Priya").
create table public.henna_stations (
  wedding_id   uuid primary key references public.weddings(id) on delete cascade,
  is_open      boolean not null default false,
  display_name text,
  updated_at   timestamptz not null default now()
);


-- ─── henna_waitlist ──────────────────────────────────────────────────────────
-- Live queue of henna sign-ups. Entries flow 'waiting' → 'in_progress'
-- → 'done'/'skipped'. Guests can 'cancelled' their own before pulling.
-- Multiple artists can serve in parallel; served_by tags which artist
-- pulled the row so per-artist chair filtering stays cheap.
create table public.henna_waitlist (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  guest_name  text not null,
  added_by    text not null,
  status      text not null default 'waiting'
              check (status in ('waiting', 'in_progress', 'done', 'skipped', 'cancelled')),
  served_by   text,
  joined_at   timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);

create index henna_waitlist_wedding_status_joined_idx
  on public.henna_waitlist (wedding_id, status, joined_at);

create index henna_waitlist_wedding_served_idx
  on public.henna_waitlist (wedding_id, served_by)
  where status = 'in_progress';


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
alter table public.event_time_overrides   enable row level security;
alter table public.ai_questions           enable row level security;
alter table public.henna_stations         enable row level security;
alter table public.henna_waitlist         enable row level security;

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
create policy "allow_all_henna_stations"         on public.henna_stations         for all using (true) with check (true);
create policy "allow_all_henna_waitlist"         on public.henna_waitlist         for all using (true) with check (true);


-- ─── RPC: admin password check ───────────────────────────────────────────────
-- Verifies the home-tab admin unlock password without ever returning the
-- value to the client. `weddings.admin_password` is deliberately not
-- SELECTed anywhere else.
create or replace function public.check_admin_password(
  p_wedding_id uuid,
  p_password   text
) returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.weddings
    where id = p_wedding_id
      and admin_password is not null
      and admin_password = p_password
  );
$$;

revoke all on function public.check_admin_password(uuid, text) from public;
grant execute on function public.check_admin_password(uuid, text) to anon, authenticated;


commit;
