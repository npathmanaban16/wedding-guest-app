-- ============================================================
-- Wedding Companion — Demo Wedding Seed (for App Store review)
-- ============================================================
-- Run this in the SaaS Supabase project's Database → SQL Editor.
-- Safe to run alongside supabase/seed_saas.sql — this seeds a
-- second, independent wedding row with fake data so reviewers
-- can exercise the full app without touching real guest data.
--
-- Credentials for App Store Connect → App Review Information:
--   Invite code: DEMO2026
--   Guest name:  Taylor Reviewer   (also an admin for this demo)
--
-- The SaaS build of the app also swaps out N&N-specific content for
-- generic equivalents via constants/weddingData.ts (Sangeet → Welcome
-- Party, Astrid → Sophie, real photo album URL → example.com), so the
-- Schedule / Packing / Admin / Photos tabs read coherently for the
-- demo wedding.
--
-- Tenant id:     a0000000-0000-0000-0000-000000000002
--                (one higher than the N&N seed; easy to spot/delete)
--
-- Idempotent: safe to re-run. The wedding / guests / admins / info
-- rows no-op on conflict. Song requests + the welcome notification
-- are wiped for THIS wedding only and re-inserted, so re-running
-- gives a clean state without touching other tenants.
-- ============================================================


-- ─── Wedding row ─────────────────────────────────────────────────────────────
-- Location + destination_city kept as Montreux so the hard-coded Schedule,
-- Switzerland guide, and Packing tabs render a coherent experience. The
-- wedding_date is May 23, 2026 — matches the hard-coded ceremony date in
-- constants/weddingData.ts so the home-screen countdown and the Schedule
-- tab's events agree with each other.

insert into public.weddings (
  id, invite_code, couple_names, wedding_date, location, destination_city,
  hashtag, website, contact_email, registry_url, theme_color
) values (
  'a0000000-0000-0000-0000-000000000002',
  'DEMO2026',
  'Emma & James',
  '2026-05-23T15:00:00Z',
  'Montreux, Switzerland',
  'Montreux',
  '#EmmaAndJames2026',
  'https://example.com/emma-and-james',
  'demo@weddingcompanion.app',
  'https://example.com/registry',
  '#8B5E6B'
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
  theme_color      = excluded.theme_color;


-- ─── Guests ──────────────────────────────────────────────────────────────────
-- Five generic names. Taylor Reviewer is doubled up as an admin below so a
-- reviewer logging in as Taylor can see both guest and admin features.

insert into public.guests (wedding_id, canonical_name, is_wedding_party, gender) values
  ('a0000000-0000-0000-0000-000000000002', 'Taylor Reviewer', true,  'female'),
  ('a0000000-0000-0000-0000-000000000002', 'Jordan Guest',    true,  'male'),
  ('a0000000-0000-0000-0000-000000000002', 'Sam Morgan',      false, 'female'),
  ('a0000000-0000-0000-0000-000000000002', 'Alex Chen',       false, 'male'),
  ('a0000000-0000-0000-0000-000000000002', 'Riley Bennett',   false, 'female')
on conflict (wedding_id, canonical_name) do nothing;


-- ─── Wedding Admins ──────────────────────────────────────────────────────────

insert into public.wedding_admins (wedding_id, guest_name) values
  ('a0000000-0000-0000-0000-000000000002', 'Taylor Reviewer')
on conflict (wedding_id, guest_name) do nothing;


-- ─── Guest Info ──────────────────────────────────────────────────────────────
-- Pre-fill meal selections + dietary for two guests so the Details tab has
-- realistic read-only data to display.

insert into public.guest_info
  (wedding_id, guest_name, dietary, meal_1, meal_2, meal_3, rehearsal_dinner, email)
values
  ('a0000000-0000-0000-0000-000000000002', 'Taylor Reviewer', '',
    'Burrata & Watermelon (Vegetarian)', 'Zucchini Risotto (Vegetarian)',
    'Spinach & Ricotta Ravioli (Vegetarian)', true,  'demo@weddingcompanion.app'),
  ('a0000000-0000-0000-0000-000000000002', 'Jordan Guest',    '',
    'Tuna Tataki', 'Roasted Prawn & Peach Tartare', 'Roasted Lamb', true,
    'jordan.demo@weddingcompanion.app')
on conflict (wedding_id, guest_name) do update set
  dietary          = excluded.dietary,
  meal_1           = excluded.meal_1,
  meal_2           = excluded.meal_2,
  meal_3           = excluded.meal_3,
  rehearsal_dinner = excluded.rehearsal_dinner,
  email            = coalesce(excluded.email, public.guest_info.email);


-- ─── Song Requests ───────────────────────────────────────────────────────────
-- A small sample so the Songs tab isn't empty on demo.

delete from public.song_requests where wedding_id = 'a0000000-0000-0000-0000-000000000002';

insert into public.song_requests (wedding_id, song, artist, requested_by) values
  ('a0000000-0000-0000-0000-000000000002', 'Dancing Queen',      'ABBA',               'Taylor'),
  ('a0000000-0000-0000-0000-000000000002', 'September',          'Earth, Wind & Fire', 'Jordan'),
  ('a0000000-0000-0000-0000-000000000002', 'Can''t Stop the Feeling', 'Justin Timberlake', 'Sam'),
  ('a0000000-0000-0000-0000-000000000002', 'Mr. Brightside',     'The Killers',        'Alex');


-- ─── Notifications ───────────────────────────────────────────────────────────
-- One welcome notification so the Messages tab has content.

delete from public.notifications where wedding_id = 'a0000000-0000-0000-0000-000000000002';

insert into public.notifications (wedding_id, message, sender) values
  ('a0000000-0000-0000-0000-000000000002',
   'Welcome to our wedding app! Tap into each tab to explore the schedule, the Switzerland guide, your packing list, and more. We can''t wait to celebrate with you.',
   'Emma & James');
