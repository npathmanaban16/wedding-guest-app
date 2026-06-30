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
-- Admin logins:  Arjun Desai, Ila Lohia  (both seeded as admins)
-- Admin password: ArjunIla   (home-tab admin unlock)
--
-- ⚠️ Known limitations remaining after this seed:
--   * The Schedule tab now reads from public.wedding_events (added in
--     migration 026 and seeded below), so the Arjun & Ila schedule is
--     correct — Sangeet, Baraat, Ceremony, Reception, with the right
--     dates, venues, and dress codes.
--   * The "switzerland" guide tab and the Packing tab are still
--     hardcoded to Montreux in constants/weddingData.ts (SWITZERLAND_GUIDE,
--     PACKING_GUIDE_*). Those are follow-up code changes — likely a
--     per-wedding-content map keyed off the wedding id, or a
--     destination_city-based switch.
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
-- wedding_date is the Saturday ceremony start at noon PDT (UTC-7), so
-- the home-screen countdown lands on the ceremony.
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
  '2026-09-12T19:00:00Z',
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
  'ArjunIla'
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
-- Both Arjun Desai and Ila Lohia are doubled up as admins
-- (wedding_admins below) so either of them logged in sees both guest
-- and admin features.

insert into public.guests (wedding_id, canonical_name, is_wedding_party, gender) values
  ('a0000000-0000-0000-0000-000000000003', 'Arjun Desai',    true,  'male'),
  ('a0000000-0000-0000-0000-000000000003', 'Ila Lohia',      true,  'female'),
  ('a0000000-0000-0000-0000-000000000003', 'Priya Sharma',   true,  'female'),
  ('a0000000-0000-0000-0000-000000000003', 'Rohan Mehta',    true,  'male'),
  ('a0000000-0000-0000-0000-000000000003', 'Anjali Kapoor',  false, 'female'),
  ('a0000000-0000-0000-0000-000000000003', 'Vikram Singh',   false, 'male')
on conflict (wedding_id, canonical_name) do nothing;


-- ─── Wedding Admins ──────────────────────────────────────────────────────────

insert into public.wedding_admins (wedding_id, guest_name) values
  ('a0000000-0000-0000-0000-000000000003', 'Arjun Desai'),
  ('a0000000-0000-0000-0000-000000000003', 'Ila Lohia')
on conflict (wedding_id, guest_name) do nothing;


-- ─── Guest Info ──────────────────────────────────────────────────────────────
-- Pre-fill meal selections + dietary for a couple of guests so the Details
-- tab has realistic read-only data to display.

insert into public.guest_info
  (wedding_id, guest_name, dietary, meal_1, meal_2, meal_3, rehearsal_dinner, email)
values
  ('a0000000-0000-0000-0000-000000000003', 'Arjun Desai', '',
    'Burrata & Heirloom Tomato', 'Pan-Seared Halibut',
    'Filet Mignon', true, 'arjun.demo@tetherly.app'),
  ('a0000000-0000-0000-0000-000000000003', 'Ila Lohia', '',
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


-- ─── Wedding Events ──────────────────────────────────────────────────────────
-- Four events:
--   1. Sangeet           — Fri 11 Sep 2026, Bella Collina (San Clemente)
--   2. Arjun's Baraat    — Sat 12 Sep 2026, Dana Lawn (Ritz-Carlton)
--   3. Wedding Ceremony  — Sat 12 Sep 2026, Bluffs Lawn (Ritz-Carlton)
--   4. Cocktail Hour & Reception — Sat 12 Sep 2026, Ritz-Carlton Ballroom
--
-- All start times are stored as UTC; California is on PDT (UTC-7) in
-- September, so e.g. 6:00 PM PDT on Fri 11 Sep = 2026-09-12T01:00:00Z.
-- end_at is left null for the Baraat (no posted end time on the site);
-- clients fall back to a 1-hour calendar block.
--
-- Color palettes are reused verbatim from constants/weddingData.ts:
-- the EVENTS_NN Sangeet palette for the Sangeet/Baraat; the EVENTS_NN
-- ceremony palette for the Ceremony/Reception.
--
-- Idempotent: re-running this seed upserts each row by (wedding_id, event_id).

insert into public.wedding_events (
  wedding_id, event_id, sort_order, title, emoji, date_label, time_label,
  venue, address, dress_code, description, notes, wedding_party_only,
  start_at, end_at, outdoor_note, extras
) values
  (
    'a0000000-0000-0000-0000-000000000003',
    'sangeet',
    1,
    'Sangeet',
    '💃',
    'Friday, 11 September 2026',
    '6:00 PM – 11:00 PM',
    'Bella Collina, San Clemente',
    'Avenida La Pata, San Clemente, CA, USA',
    'Vibrant and Festive Indian Attire',
    'Get ready for a night of music, dancing, and nonstop energy as we celebrate our Sangeet at Bella Collina! From performances to an open dance floor, this is where the party really begins. Bring your best moves!',
    'Shuttles will be provided from the Ritz Carlton to the venue.',
    false,
    '2026-09-12T01:00:00Z',
    '2026-09-12T06:00:00Z',
    null,
    jsonb_build_object(
      'colorPalette', jsonb_build_array(
        jsonb_build_object('name','ruby red',     'hex','#9B1C1C'),
        jsonb_build_object('name','magenta',      'hex','#C41E5E'),
        jsonb_build_object('name','burnt orange', 'hex','#E8602C'),
        jsonb_build_object('name','marigold',     'hex','#F0A500'),
        jsonb_build_object('name','emerald green','hex','#006B3C'),
        jsonb_build_object('name','teal',         'hex','#007272'),
        jsonb_build_object('name','light blue',   'hex','#89CFF0'),
        jsonb_build_object('name','sapphire',     'hex','#0F52BA')
      )
    )
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'baraat',
    2,
    'Arjun''s Baraat',
    '🥁',
    'Saturday, 12 September 2026',
    '10:00 AM',
    'Dana Lawn, Ritz-Carlton Laguna Niguel',
    'The Ritz-Carlton, Laguna Niguel, Ritz Carlton Drive, Dana Point, CA, USA',
    'Festive Indian attire',
    'The big day starts here! Join us for Arjun''s Baraat, a high-energy procession as friends and family come together to welcome the groom in style.',
    'A light breakfast will be served beforehand in the Pavilion before the Baraat begins!',
    false,
    '2026-09-12T17:00:00Z',
    null,
    null,
    jsonb_build_object(
      'colorPalette', jsonb_build_array(
        jsonb_build_object('name','ruby red',     'hex','#9B1C1C'),
        jsonb_build_object('name','magenta',      'hex','#C41E5E'),
        jsonb_build_object('name','burnt orange', 'hex','#E8602C'),
        jsonb_build_object('name','marigold',     'hex','#F0A500'),
        jsonb_build_object('name','emerald green','hex','#006B3C'),
        jsonb_build_object('name','teal',         'hex','#007272'),
        jsonb_build_object('name','light blue',   'hex','#89CFF0'),
        jsonb_build_object('name','sapphire',     'hex','#0F52BA')
      )
    )
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'ceremony',
    3,
    'Wedding Ceremony',
    '💍',
    'Saturday, 12 September 2026',
    '12:00 PM',
    'Bluffs Lawn, Ritz-Carlton Laguna Niguel',
    'The Ritz-Carlton, Laguna Niguel, Ritz Carlton Drive, Dana Point, CA, USA',
    'Indian formal or black-tie',
    'Join us for our wedding ceremony on the Bluffs Lawn as we exchange vows and begin our forever. Set against the ocean, this meaningful ceremony is filled with timeless traditions and rituals as we celebrate our union surrounded by loved ones.',
    'Following the ceremony, lunch will be served at the Pavilion.',
    false,
    '2026-09-12T19:00:00Z',
    '2026-09-12T20:00:00Z',
    'As the ceremony will be outdoors, don''t forget your sunnies and sunscreen!',
    jsonb_build_object(
      'colorPalette', jsonb_build_array(
        jsonb_build_object('name','blush',        'hex','#F2C4CE'),
        jsonb_build_object('name','dusty rose',   'hex','#C8A0A0'),
        jsonb_build_object('name','champagne',    'hex','#EDD9A3'),
        jsonb_build_object('name','sage',         'hex','#8FAF88'),
        jsonb_build_object('name','dove gray',    'hex','#A8AFB8'),
        jsonb_build_object('name','charcoal',     'hex','#3C4043'),
        jsonb_build_object('name','black',        'hex','#000000'),
        jsonb_build_object('name','deep taupe',   'hex','#6B5A4E'),
        jsonb_build_object('name','muted plum',   'hex','#7B5080'),
        jsonb_build_object('name','antique gold', 'hex','#C9A84C')
      ),
      'blackTieGuide', jsonb_build_object(
        'men',   'Tuxedos (or a black suit)',
        'women', 'Floor-length gowns or formal Indian attire such as sarees or lehengas'
      )
    )
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'reception',
    4,
    'Cocktail Hour & Reception',
    '🥂',
    'Saturday, 12 September 2026',
    '6:00 PM',
    'Monarch Courtyard & Ritz-Carlton Ballroom',
    'The Ritz-Carlton, Laguna Niguel, Ritz Carlton Drive, Dana Point, CA, USA',
    'Indian Formal or Black-Tie Attire',
    'Spend the evening with us as cocktail hour begins in the Monarch Courtyard, followed by our wedding reception in the Ritz-Carlton Ballroom. Enjoy drinks, delicious bites, dinner, and plenty of dancing as we celebrate together all night long!',
    null,
    false,
    '2026-09-13T01:00:00Z',
    '2026-09-13T07:00:00Z',
    null,
    jsonb_build_object(
      'colorPalette', jsonb_build_array(
        jsonb_build_object('name','blush',        'hex','#F2C4CE'),
        jsonb_build_object('name','dusty rose',   'hex','#C8A0A0'),
        jsonb_build_object('name','champagne',    'hex','#EDD9A3'),
        jsonb_build_object('name','sage',         'hex','#8FAF88'),
        jsonb_build_object('name','dove gray',    'hex','#A8AFB8'),
        jsonb_build_object('name','charcoal',     'hex','#3C4043'),
        jsonb_build_object('name','black',        'hex','#000000'),
        jsonb_build_object('name','deep taupe',   'hex','#6B5A4E'),
        jsonb_build_object('name','muted plum',   'hex','#7B5080'),
        jsonb_build_object('name','antique gold', 'hex','#C9A84C')
      ),
      'blackTieGuide', jsonb_build_object(
        'men',   'Tuxedos (or a black suit)',
        'women', 'Floor-length gowns or formal Indian attire such as sarees or lehengas'
      )
    )
  )
on conflict (wedding_id, event_id) do update set
  sort_order         = excluded.sort_order,
  title              = excluded.title,
  emoji              = excluded.emoji,
  date_label         = excluded.date_label,
  time_label         = excluded.time_label,
  venue              = excluded.venue,
  address            = excluded.address,
  dress_code         = excluded.dress_code,
  description        = excluded.description,
  notes              = excluded.notes,
  wedding_party_only = excluded.wedding_party_only,
  start_at           = excluded.start_at,
  end_at             = excluded.end_at,
  outdoor_note       = excluded.outdoor_note,
  extras             = excluded.extras,
  updated_at         = now();
