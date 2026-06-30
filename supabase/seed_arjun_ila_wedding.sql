-- ============================================================
-- Tetherly — Arjun & Ila Demo Wedding Seed
-- ============================================================
-- Pitch demo for a potential couple (Arjun & Ila), getting married
-- at The Ritz-Carlton, Laguna Niguel on Sat 12 Sep 2026, with a
-- welcome event on Fri 11 Sep 2026.
--
-- Run this in the SaaS Supabase project's Database → SQL Editor.
-- Safe to run alongside seed_demo_wedding.sql and seed_saas.sql —
-- this seeds a new independent wedding row with a fresh UUID and
-- invite code, so it doesn't touch any existing tenant data.
--
-- Tenant id:     a0000000-0000-0000-0000-000000000003
--                (one higher than the Emma & James demo for easy
--                 spotting / deletion)
-- Invite code:   ARJUNILA2026
-- Admin login:   Arjun Demo   (also seeded as an admin)
-- Admin password: arjunila123  (home-tab admin unlock)
--
-- ⚠️ Known limitation: as of this seed, the Schedule, Guide
-- ("switzerland" tab), and Packing tabs are still hardcoded to
-- Montreux in constants/weddingData.ts (EVENTS_NN / EVENTS_DEMO,
-- SWITZERLAND_GUIDE, PACKING_GUIDE_*). A new wedding row alone
-- won't make those tabs Laguna-Niguel-aware. That's a follow-up
-- code change (likely a per-wedding-content map keyed off the
-- wedding id, or a destination_city-based switch).
--
-- Hero image: leave hero_image_url null for now and either
--   1. upload a Ritz-Carlton Laguna Niguel photo to the
--      `wedding-hero-images` bucket (migration 025), then UPDATE
--      this row's hero_image_url to the public URL; or
--   2. swap to a different hosted URL (CDN, marketing photo, etc.).
-- Until set, the home screen falls back to the bundled montreux.png
-- (which obviously isn't right for a California demo — please set
-- this before pitching).
--
-- Idempotent: safe to re-run. Wedding / guests / admins / info rows
-- no-op or upsert on conflict. Song requests and the welcome
-- notification are wiped for THIS wedding only and re-inserted.
-- ============================================================


-- ─── Wedding row ─────────────────────────────────────────────────────────────
-- wedding_date is the Saturday ceremony at ~3pm PDT (UTC-7) so the
-- home-screen countdown lands on the right local time.
-- contact_email points at Neha's personal Gmail (the Resend free-tier
-- signup address) so notification emails fired from the demo actually
-- deliver; swap once a verified Resend sender domain is in place.

insert into public.weddings (
  id, invite_code, couple_names, wedding_date, location, destination_city,
  hashtag, website, contact_email, registry_url, hero_image_url,
  theme_color, planner_name, photo_album_url, admin_password
) values (
  'a0000000-0000-0000-0000-000000000003',
  'ARJUNILA2026',
  'Arjun & Ila',
  '2026-09-12T22:00:00Z',
  'The Ritz-Carlton, Laguna Niguel',
  'Laguna Niguel',
  '#ArjunAndIla2026',
  'https://example.com/arjun-and-ila',
  'neha.pathmanaban.2016@gmail.com',
  'https://example.com/registry',
  null,
  '#8B5E6B',
  'Sophie',
  'https://example.com/photos',
  'arjunila123'
) on conflict (id) do update set
  invite_code      = excluded.invite_code,
  couple_names     = excluded.couple_names,
  wedding_date     = excluded.wedding_date,
  location         = excluded.location,
  destination_city = excluded.destination_city,
  hashtag          = excluded.hashtag,
  website          = excluded.website,
  contact_email    = excluded.contact_email,
  registry_url     = excluded.registry_url,
  theme_color      = excluded.theme_color,
  planner_name     = excluded.planner_name,
  photo_album_url  = excluded.photo_album_url,
  admin_password   = excluded.admin_password;
  -- hero_image_url intentionally NOT overwritten on conflict so that
  -- a value set via the dashboard isn't clobbered by re-running this seed.


-- ─── Guests ──────────────────────────────────────────────────────────────────
-- Small sample so login + the Details tab have realistic content.
-- Arjun Demo is doubled up as an admin (wedding_admins below) so the
-- pitch viewer logging in as Arjun sees both guest and admin features.

insert into public.guests (wedding_id, canonical_name, is_wedding_party, gender) values
  ('a0000000-0000-0000-0000-000000000003', 'Arjun Demo',     true,  'male'),
  ('a0000000-0000-0000-0000-000000000003', 'Ila Demo',       true,  'female'),
  ('a0000000-0000-0000-0000-000000000003', 'Priya Sharma',   true,  'female'),
  ('a0000000-0000-0000-0000-000000000003', 'Rohan Mehta',    true,  'male'),
  ('a0000000-0000-0000-0000-000000000003', 'Anjali Kapoor',  false, 'female'),
  ('a0000000-0000-0000-0000-000000000003', 'Vikram Singh',   false, 'male')
on conflict (wedding_id, canonical_name) do nothing;


-- ─── Wedding Admins ──────────────────────────────────────────────────────────

insert into public.wedding_admins (wedding_id, guest_name) values
  ('a0000000-0000-0000-0000-000000000003', 'Arjun Demo')
on conflict (wedding_id, guest_name) do nothing;


-- ─── Guest Info ──────────────────────────────────────────────────────────────
-- Pre-fill meal selections + dietary for a couple of guests so the Details
-- tab has realistic read-only data to display.

insert into public.guest_info
  (wedding_id, guest_name, dietary, meal_1, meal_2, meal_3, rehearsal_dinner, email)
values
  ('a0000000-0000-0000-0000-000000000003', 'Arjun Demo', '',
    'Burrata & Heirloom Tomato', 'Pan-Seared Halibut',
    'Filet Mignon', true, 'arjun.demo@tetherly.app'),
  ('a0000000-0000-0000-0000-000000000003', 'Ila Demo', '',
    'Burrata & Heirloom Tomato', 'Wild Mushroom Risotto (Vegetarian)',
    'Filet Mignon', true, 'ila.demo@tetherly.app'),
  ('a0000000-0000-0000-0000-000000000003', 'Priya Sharma', '',
    'Heirloom Beet Salad', 'Wild Mushroom Risotto (Vegetarian)',
    'Spinach & Ricotta Ravioli (Vegetarian)', true, 'priya.demo@tetherly.app')
on conflict (wedding_id, guest_name) do update set
  dietary          = excluded.dietary,
  meal_1           = excluded.meal_1,
  meal_2           = excluded.meal_2,
  meal_3           = excluded.meal_3,
  rehearsal_dinner = excluded.rehearsal_dinner,
  email            = coalesce(excluded.email, public.guest_info.email);


-- ─── Song Requests ───────────────────────────────────────────────────────────

delete from public.song_requests where wedding_id = 'a0000000-0000-0000-0000-000000000003';

insert into public.song_requests (wedding_id, song, artist, requested_by) values
  ('a0000000-0000-0000-0000-000000000003', 'Tum Hi Ho',          'Arijit Singh',       'Priya'),
  ('a0000000-0000-0000-0000-000000000003', 'Levitating',         'Dua Lipa',           'Rohan'),
  ('a0000000-0000-0000-0000-000000000003', 'Kala Chashma',       'Amar Arshi',         'Anjali'),
  ('a0000000-0000-0000-0000-000000000003', 'I Wanna Dance with Somebody', 'Whitney Houston', 'Vikram');


-- ─── Notifications ───────────────────────────────────────────────────────────

delete from public.notifications where wedding_id = 'a0000000-0000-0000-0000-000000000003';

insert into public.notifications (wedding_id, message, sender) values
  ('a0000000-0000-0000-0000-000000000003',
   'Welcome to our wedding app! Tap into each tab to explore the schedule, the local guide, your packing list, and more. We can''t wait to celebrate with you at the Ritz-Carlton, Laguna Niguel.',
   'Arjun & Ila');
