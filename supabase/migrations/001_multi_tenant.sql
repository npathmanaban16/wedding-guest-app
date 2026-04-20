-- ============================================================
-- Migration 001: Multi-tenant schema (non-destructive)
-- ============================================================
-- Brings a pre-multi-tenant database (the original Neha & Naveen
-- schema) up to the multi-tenant schema defined in supabase/schema.sql.
--
-- This is the file to run against the live N&N Supabase project.
-- It does NOT drop or recreate any existing tables, so real RSVP /
-- hotel / flight data guests have entered is preserved.
--
-- What it does:
--   • Creates weddings / guests / wedding_admins if they don't exist.
--   • Seeds the N&N wedding row with the fixed UUID that all of the
--     new `wedding_id` column defaults point at.
--   • Adds wedding_id (not null, default = N&N UUID) to every existing
--     table. Existing rows are backfilled by the default.
--   • Seeds the 119 guests and 3 admins from constants/guests.ts.
--   • Idempotent: safe to re-run. Re-runs no-op on existing rows.
--
-- BEFORE RUNNING: take a database backup (Supabase → Database → Backups).
-- Run this as a single transaction in the SQL Editor.
-- ============================================================

begin;


-- ─── New tables ──────────────────────────────────────────────────

create table if not exists public.weddings (
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

create table if not exists public.guests (
  id                uuid primary key default gen_random_uuid(),
  wedding_id        uuid not null references public.weddings(id) on delete cascade,
  canonical_name    text not null,
  is_wedding_party  boolean not null default false,
  gender            text check (gender in ('male', 'female')),
  created_at        timestamptz default now(),
  unique (wedding_id, canonical_name)
);

create table if not exists public.wedding_admins (
  id         uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_name text not null,
  created_at timestamptz default now(),
  unique (wedding_id, guest_name)
);


-- ─── Seed the N&N wedding ────────────────────────────────────────
-- Must run before adding wedding_id FK columns below, since those
-- columns default to this row's id.

insert into public.weddings (
  id, invite_code, couple_names, wedding_date, location, destination_city,
  hashtag, website, contact_email, registry_url, theme_color
) values (
  '00000000-0000-0000-0000-000000000001',
  'NEHANAVEEN2026',
  'Neha & Naveen',
  '2026-05-23T15:00:00Z',
  'Montreux, Switzerland',
  'Montreux',
  '#NehaNaveen2026',
  'https://www.neha-naveen.com',
  'nehanaveen2026@gmail.com',
  'https://blissandbone.sendbirdie.com/r/neha-naveen',
  '#8B5E6B'
)
on conflict (id) do nothing;


-- ─── Add wedding_id to existing tables ───────────────────────────
-- Default = the N&N wedding, so existing rows are auto-backfilled and
-- existing app code (which doesn't yet pass wedding_id) keeps working.

alter table public.guest_info
  add column if not exists wedding_id uuid
    not null
    default '00000000-0000-0000-0000-000000000001'
    references public.weddings(id) on delete cascade;

alter table public.song_requests
  add column if not exists wedding_id uuid
    not null
    default '00000000-0000-0000-0000-000000000001'
    references public.weddings(id) on delete cascade;

alter table public.notifications
  add column if not exists wedding_id uuid
    not null
    default '00000000-0000-0000-0000-000000000001'
    references public.weddings(id) on delete cascade;

alter table public.notification_reactions
  add column if not exists wedding_id uuid
    not null
    default '00000000-0000-0000-0000-000000000001'
    references public.weddings(id) on delete cascade;

alter table public.notification_replies
  add column if not exists wedding_id uuid
    not null
    default '00000000-0000-0000-0000-000000000001'
    references public.weddings(id) on delete cascade;

alter table public.packing_checklist
  add column if not exists wedding_id uuid
    not null
    default '00000000-0000-0000-0000-000000000001'
    references public.weddings(id) on delete cascade;


-- ─── Bring guest_info columns up to schema.sql ───────────────────
-- email / phone / push_token were added via manual ALTERs in an earlier
-- rollout. Declare them here too so databases that missed the ALTER get
-- caught up; databases that already have them no-op.

alter table public.guest_info add column if not exists email      text default '';
alter table public.guest_info add column if not exists phone      text default '';
alter table public.guest_info add column if not exists push_token text;


-- ─── Seed guests ─────────────────────────────────────────────────
-- (wedding_id, canonical_name) is unique, so re-runs no-op.

insert into public.guests (wedding_id, canonical_name, is_wedding_party, gender) values
  ('00000000-0000-0000-0000-000000000001', 'Neha Pathmanaban', true, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Naveen Nath', true, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Pathmanaban Raj', true, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Kalpana Pathmanaban', true, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Vishnu Pathmanaban', true, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Amar Nath', true, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Sandhya Nath', true, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Neel Nath', true, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Aya Nath', true, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Olivia Zhu', true, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Akanksha Singh', true, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Suhail Goyal', true, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Sayantanee Das', true, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Guhan Muruganandam', true, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Ritika Patil', true, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Kevin Labagnara', true, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Gaurie Mittal', true, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Sai Avala', true, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Nikila Vasudevan', true, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Goutham Subramanian', true, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Liz Paulino', true, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Andrew Ball', true, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Connor Franklin', true, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Alec Mirchandani', true, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Eleni Karandreas', true, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Alex Shih', true, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Nancy Kwan', true, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Jedidiah Glass', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Edel Dhuibheanaigh', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Elliott Baker', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Mary Dick', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Andrew You', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Jason Luo', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Grace Mutoko', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Paul Mas', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Sankash Shankar', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Bhavya Varma', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Leon Mirson', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Moeko Nagatsuka', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Rushil Sheth', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Tithi Raval', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Karam Tatla', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Jenna Freedman', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Ben Biswas', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Danielle Skelly', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Subbarao Addaganti', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Anitha Addaganti', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Yash Addaganti', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Trisha Addaganti', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Prasanna Bekal', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Vindhya Bekal', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Pallavi Bekal', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Tanvi Bekal', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Ram Sankaran', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Uma Ramanathan', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Rahul Ramanathan', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Abhay Mhatre', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Archana Mhatre', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Madhu Somenhalli', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Shashi Somenhalli', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Nithin Somenhalli', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Anand Palani', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Sujatha Palani', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Arthi Palani', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Sainath Palani', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Vivek Seth', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Ashvani Vivek', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Saravanan Kandaswamy', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Chrisvin Jabamani', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Howard Li', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Lingesh Radjou', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Rajesh Radjou', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Prabakaran Vasan', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Kannagi Prabakaran', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Neha Dubey', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Pooja Dubey', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Rakesh Dubey', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Neelu Dubey', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Vijay Kumar', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Sadhana Kumar', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Vikas Kumar', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Riva Kumar', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Vivek Kumar', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Jaya Kumar', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Sanjay Mishra', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Seema Verma', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Shaan Mishra', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Maya Mishra', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Anand Tewari', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Sangita Tewari', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Jeevan Tewari', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Lauren Bordeaux', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Ravi Tewari', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Tali Tudryn', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Sanjiv Upadhyay', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Meena Upadhyay', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Archana Upadhyay', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Kirin Upadhyay', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Serena Upadhyay', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Matt Uthupan', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Tushita Shrivastav', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Gugu Chohan', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Dennis Porto', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Jan Porto', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Diane Hedden', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Mary Kay Buchsbaum', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Bruce Buchsbaum', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Bruce Baker', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Kelli Baker', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Roshan Ram', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Bhavika Patel', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Jinesh Patel', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Radhika Kirpalani', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Tarun Kirpalani', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Nitya Srikishen', false, 'female'),
  ('00000000-0000-0000-0000-000000000001', 'Puneet Lakhi', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Marwan Bayoumy', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Asokan Selvaraj', false, 'male'),
  ('00000000-0000-0000-0000-000000000001', 'Sujatha Asokan', false, 'female')
on conflict (wedding_id, canonical_name) do nothing;


-- ─── Seed admins ─────────────────────────────────────────────────

insert into public.wedding_admins (wedding_id, guest_name) values
  ('00000000-0000-0000-0000-000000000001', 'Neha Pathmanaban'),
  ('00000000-0000-0000-0000-000000000001', 'Naveen Nath'),
  ('00000000-0000-0000-0000-000000000001', 'Astrid Rolando')
on conflict (wedding_id, guest_name) do nothing;


-- ─── RLS on new tables ───────────────────────────────────────────
-- Match schema.sql: permissive policies until Supabase Auth lands.
-- (Existing tables' RLS state is left alone so we don't accidentally
-- change the behavior of live queries.)

alter table public.weddings       enable row level security;
alter table public.guests         enable row level security;
alter table public.wedding_admins enable row level security;

drop policy if exists "allow_all_weddings"       on public.weddings;
drop policy if exists "allow_all_guests"         on public.guests;
drop policy if exists "allow_all_wedding_admins" on public.wedding_admins;

create policy "allow_all_weddings"       on public.weddings       for all using (true) with check (true);
create policy "allow_all_guests"         on public.guests         for all using (true) with check (true);
create policy "allow_all_wedding_admins" on public.wedding_admins for all using (true) with check (true);


commit;


-- ─── Verification ────────────────────────────────────────────────
-- Run these after the migration and sanity-check the counts.

select 'weddings' as table, count(*) as rows from public.weddings
union all select 'guests',         count(*) from public.guests
union all select 'wedding_admins', count(*) from public.wedding_admins
union all select 'guest_info',     count(*) from public.guest_info
union all select 'guest_info_with_wedding_id', count(*)
            from public.guest_info where wedding_id is not null;
