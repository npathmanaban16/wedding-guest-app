-- ============================================================
-- Tetherly — Serena & Matthew Wedding Seed
-- ============================================================
-- Serena Upadhyay & Matthew Uthupan's wedding weekend across four
-- venues in downtown Mexico City in November 2027:
--   * Sat 6 Nov 2027 — Church ceremony, then Sangeet at Sofitel
--   * Sun 7 Nov 2027 — Hindu ceremony at Casa del Corregidor,
--                       then reception at Ex Convento San Hipólito
-- Guest home base is the Sofitel Mexico City Reforma.
--
-- Run this in the SaaS Supabase project's Database → SQL Editor.
-- Safe to run alongside seed_demo_wedding.sql and
-- seed_arjun_ila_wedding.sql — this seeds a new independent wedding
-- row with a fresh UUID and invite code, so it doesn't touch any
-- existing tenant data.
--
-- Tenant id:      a0000000-0000-0000-0000-000000000004
--                 (one higher than the Arjun & Ila demo for easy
--                  spotting / deletion)
-- Invite code:    SERENAMATT2027
-- Admin logins:   Serena Upadhyay, Matthew Uthupan  (both seeded as
--                 admins)
-- Admin password: SerenaMatt   (home-tab admin unlock)
-- Henna artist:   Login name 'Henna Artist' (role='henna_artist').
--                 Placeholder — swap to a real artist name later via
--                 the wedding_admins row / dashboard once known.
--
-- Placeholders to update once the couple confirms details:
--   * Church ceremony venue + address (currently "Church (Venue TBD)")
--   * hero_image_url (currently null — home tab falls back to the
--     bundled montreux.png until an image is uploaded to the
--     wedding-hero-images bucket)
--   * contact_email points at Neha's personal Gmail so demo emails
--     actually deliver; swap to the couple's shared inbox before
--     shipping to real guests.
--
-- Idempotent: safe to re-run. Wedding / guests / admins / info rows
-- no-op or upsert on conflict. Song requests and the welcome
-- notification are wiped for THIS wedding only and re-inserted.
-- ============================================================


-- ─── Wedding row ─────────────────────────────────────────────────────
-- wedding_date lands on the Saturday church ceremony start (3 PM CST)
-- so the home-screen countdown targets the first event of the weekend.
-- Mexico City runs on Central Standard Time (UTC−6) year-round — DST
-- was abolished for most of Mexico in October 2022 — so 3:00 PM CST on
-- Sat 6 Nov 2027 = 2027-11-06T21:00:00Z.

insert into public.weddings (
  id, invite_code, couple_names, wedding_date, location, destination_city,
  hashtag, website, contact_email, registry_url, hero_image_url,
  theme_color, planner_name, photo_album_url, admin_password
) values (
  'a0000000-0000-0000-0000-000000000004',
  'SERENAMATT2027',
  'Serena & Matthew',
  '2027-11-06T21:00:00Z',
  'Downtown Mexico City',
  'Mexico City',
  '#SerenaAndMatthew2027',
  'https://example.com/serena-and-matthew',
  'neha.pathmanaban.2016@gmail.com',
  'https://example.com/registry',
  null,
  '#8B5E6B',
  'Sophie',
  'https://example.com/photos',
  'SerenaMatt'
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
  -- hero_image_url intentionally NOT overwritten on conflict so a value
  -- set via the dashboard isn't clobbered by re-running this seed.


-- ─── Guests ──────────────────────────────────────────────────────────
-- Small sample guest list spanning family, bridal party, and friends
-- across both sides. Both Serena Upadhyay and Matthew Uthupan carry
-- is_couple=true so the Attendees directory hides them from the
-- "who's here" list; they also carry admin access via wedding_admins
-- below.
--
-- wedding_party_role landed in migration 036: 'bridesmaid' / 'groomsman'
-- shows a "Wedding party" badge in the Attendees directory and sorts
-- those rows to the top; NULL on a non-wedding-party row just leaves
-- them as regular attendees.
--
-- On-conflict UPDATE (rather than DO NOTHING) so re-running this seed
-- after later migrations lands is_couple / wedding_party_role backfills
-- correctly on existing rows.

insert into public.guests
  (wedding_id, canonical_name, is_wedding_party, is_couple, gender, wedding_party_role) values
  ('a0000000-0000-0000-0000-000000000004', 'Serena Upadhyay',   true,  true,  'female', null),
  ('a0000000-0000-0000-0000-000000000004', 'Matthew Uthupan',   true,  true,  'male',   null),
  ('a0000000-0000-0000-0000-000000000004', 'Sanjiv Upadhyay',   false, false, 'male',   null),
  ('a0000000-0000-0000-0000-000000000004', 'Meena Upadhyay',    false, false, 'female', null),
  ('a0000000-0000-0000-0000-000000000004', 'Archana Upadhyay',  true,  false, 'female', 'bridesmaid'),
  ('a0000000-0000-0000-0000-000000000004', 'Kirin Upadhyay',    true,  false, 'female', 'bridesmaid'),
  ('a0000000-0000-0000-0000-000000000004', 'Priya Nair',        true,  false, 'female', 'bridesmaid'),
  ('a0000000-0000-0000-0000-000000000004', 'Rohan Menon',       true,  false, 'male',   'groomsman'),
  ('a0000000-0000-0000-0000-000000000004', 'Daniel Uthupan',    true,  false, 'male',   'groomsman'),
  ('a0000000-0000-0000-0000-000000000004', 'Sarah Uthupan',     false, false, 'female', null),
  ('a0000000-0000-0000-0000-000000000004', 'Elena García',      false, false, 'female', null),
  ('a0000000-0000-0000-0000-000000000004', 'Diego Ramírez',     false, false, 'male',   null),
  ('a0000000-0000-0000-0000-000000000004', 'Aisha Khan',        false, false, 'female', null),
  ('a0000000-0000-0000-0000-000000000004', 'James O''Sullivan', false, false, 'male',   null)
on conflict (wedding_id, canonical_name) do update set
  is_wedding_party   = excluded.is_wedding_party,
  is_couple          = excluded.is_couple,
  gender             = excluded.gender,
  wedding_party_role = excluded.wedding_party_role;


-- ─── Wedding Admins ──────────────────────────────────────────────────

insert into public.wedding_admins (wedding_id, guest_name) values
  ('a0000000-0000-0000-0000-000000000004', 'Serena Upadhyay'),
  ('a0000000-0000-0000-0000-000000000004', 'Matthew Uthupan')
on conflict (wedding_id, guest_name) do nothing;

-- Henna artist vendor login (role='henna_artist'). Login-only, no
-- admin powers; lands on /henna-artist after signing in. Left literally
-- named 'Henna Artist' per the couple's setup — swap to the artist's
-- real name later once known. gender left NULL because the artist-side
-- flow doesn't need it.
insert into public.wedding_admins
  (wedding_id, guest_name, is_wedding_party, gender, role)
values
  ('a0000000-0000-0000-0000-000000000004', 'Henna Artist', true, null, 'henna_artist')
on conflict (wedding_id, guest_name) do update set
  is_wedding_party = excluded.is_wedding_party,
  gender           = excluded.gender,
  role             = excluded.role;

-- Henna station — starts closed. The artist can toggle it open from
-- their queue screen when henna is ready for guests. display_name is
-- left null so the guest UI falls back to the generic "Henna waitlist"
-- heading rather than surfacing the placeholder "Henna Artist" name.
insert into public.henna_stations (wedding_id, is_open, display_name)
values ('a0000000-0000-0000-0000-000000000004', false, null)
on conflict (wedding_id) do update set display_name = excluded.display_name;


-- ─── Guest Info ──────────────────────────────────────────────────────
-- Pre-fill a couple of guests with sample info so the Details tab has
-- realistic read-only data to display.

insert into public.guest_info
  (wedding_id, guest_name, dietary, rehearsal_dinner, email)
values
  ('a0000000-0000-0000-0000-000000000004', 'Serena Upadhyay', '',
    true, 'serena.demo@tetherly.app'),
  ('a0000000-0000-0000-0000-000000000004', 'Matthew Uthupan', '',
    true, 'matthew.demo@tetherly.app'),
  ('a0000000-0000-0000-0000-000000000004', 'Priya Nair', 'Vegetarian',
    true, 'priya.demo@tetherly.app')
on conflict (wedding_id, guest_name) do update set
  dietary          = excluded.dietary,
  rehearsal_dinner = excluded.rehearsal_dinner,
  email            = coalesce(excluded.email, public.guest_info.email);


-- ─── Song Requests ───────────────────────────────────────────────────
-- Small sample so the Songs tab isn't empty on first login.

delete from public.song_requests where wedding_id = 'a0000000-0000-0000-0000-000000000004';

insert into public.song_requests (wedding_id, song, artist, requested_by) values
  ('a0000000-0000-0000-0000-000000000004', 'Tum Hi Ho',       'Arijit Singh',     'Priya'),
  ('a0000000-0000-0000-0000-000000000004', 'Despacito',       'Luis Fonsi',       'Diego'),
  ('a0000000-0000-0000-0000-000000000004', 'Chaiyya Chaiyya', 'Sukhwinder Singh', 'Rohan'),
  ('a0000000-0000-0000-0000-000000000004', 'Perfect',         'Ed Sheeran',       'Sarah');


-- ─── Notifications ───────────────────────────────────────────────────

delete from public.notifications where wedding_id = 'a0000000-0000-0000-0000-000000000004';

insert into public.notifications (wedding_id, message, sender) values
  ('a0000000-0000-0000-0000-000000000004',
   'Welcome to our wedding app! Tap into each tab to explore the schedule, your packing list, and more. We can''t wait to celebrate with you across our four venues in Mexico City!',
   'Serena & Matthew');


-- ─── Wedding Events ──────────────────────────────────────────────────
-- Four events across two days in downtown Mexico City:
--   1. Church Ceremony — Sat 6 Nov 2027, venue TBD downtown
--   2. Sangeet         — Sat 6 Nov 2027, Sofitel Mexico City Reforma
--   3. Hindu Ceremony  — Sun 7 Nov 2027, Casa del Corregidor
--   4. Reception       — Sun 7 Nov 2027, Ex Convento San Hipólito
--
-- All start times are stored as UTC; Mexico City runs on CST (UTC−6)
-- year-round (no DST), so e.g. 3:00 PM CST on Sat 6 Nov 2027
-- = 2027-11-06T21:00:00Z.
--
-- Color palettes reuse the two Arjun & Ila sets — bright/festive for
-- the Sangeet and Hindu ceremony, muted/formal for the church ceremony
-- and reception — since those already read well as attire guides on
-- the schedule tab.
--
-- Idempotent: re-running this seed upserts each row by
-- (wedding_id, event_id).

insert into public.wedding_events (
  wedding_id, event_id, sort_order, title, emoji, date_label, time_label,
  venue, address, dress_code, description, notes, wedding_party_only,
  start_at, end_at, outdoor_note, extras
) values
  (
    'a0000000-0000-0000-0000-000000000004',
    'church-ceremony',
    1,
    'Church Ceremony',
    '⛪',
    'Saturday, 6 November 2027',
    '3:00 PM – 4:30 PM',
    'Church (Venue TBD)',
    'Downtown Mexico City, Mexico',
    'Formal / cocktail attire',
    'Join us for our church ceremony as we exchange vows and begin our married life together — a meaningful traditional service surrounded by our closest family and friends.',
    'Shuttle transportation from the Sofitel Mexico City Reforma will be provided.',
    false,
    '2027-11-06T21:00:00Z',
    '2027-11-06T22:30:00Z',
    null,
    jsonb_build_object(
      'colorPalette', jsonb_build_array(
        jsonb_build_object('name','blush',        'hex','#F2C4CE'),
        jsonb_build_object('name','dusty rose',   'hex','#C8A0A0'),
        jsonb_build_object('name','champagne',    'hex','#EDD9A3'),
        jsonb_build_object('name','sage',         'hex','#8FAF88'),
        jsonb_build_object('name','dove gray',    'hex','#A8AFB8'),
        jsonb_build_object('name','charcoal',     'hex','#3C4043'),
        jsonb_build_object('name','deep taupe',   'hex','#6B5A4E'),
        jsonb_build_object('name','antique gold', 'hex','#C9A84C')
      )
    )
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'sangeet',
    2,
    'Sangeet',
    '💃',
    'Saturday, 6 November 2027',
    '7:00 PM – 11:00 PM',
    'Sofitel Mexico City Reforma',
    'Av. Paseo de la Reforma 297, Cuauhtémoc, 06500 Ciudad de México, CDMX, Mexico',
    'Vibrant and Festive Indian Attire',
    'The party is on! Join us for our Sangeet at the Sofitel — a night of music, dancing, performances, and nonstop energy as we celebrate our two families coming together. Come ready to hit the dance floor!',
    'Held right at our guest home base — no shuttle needed.',
    false,
    '2027-11-07T01:00:00Z',
    '2027-11-07T05:00:00Z',
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
    'a0000000-0000-0000-0000-000000000004',
    'hindu-ceremony',
    3,
    'Hindu Ceremony',
    '🕉️',
    'Sunday, 7 November 2027',
    '10:00 AM – 1:00 PM',
    'Casa del Corregidor',
    'Casa del Corregidor, Downtown Mexico City, Mexico',
    'Festive Indian Attire',
    'Join us for our traditional Hindu ceremony at Casa del Corregidor — a morning filled with meaningful rituals as we exchange sacred vows surrounded by loved ones.',
    'Shuttle transportation from the Sofitel Mexico City Reforma will be provided. Lunch will be served after the ceremony.',
    false,
    '2027-11-07T16:00:00Z',
    '2027-11-07T19:00:00Z',
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
    'a0000000-0000-0000-0000-000000000004',
    'reception',
    4,
    'Reception',
    '🥂',
    'Sunday, 7 November 2027',
    '6:00 PM – 11:00 PM',
    'Ex Convento San Hipólito',
    'Ex Convento de San Hipólito, Centro Histórico, Mexico City, Mexico',
    'Indian Formal or Black-Tie Attire',
    'Cap off the weekend with us at Ex Convento San Hipólito for our wedding reception. Cocktails, dinner, and dancing in one of Mexico City''s most beautiful historic venues as we celebrate all night long!',
    'Shuttle transportation from the Sofitel Mexico City Reforma will be provided.',
    false,
    '2027-11-08T00:00:00Z',
    '2027-11-08T05:00:00Z',
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


-- ─── Schedule Page Overrides ─────────────────────────────────────────
-- Sets the CST timezone footer under the schedule timeline. venue_photo_url
-- and venue_map_image_urls are left null / empty — until you upload photos
-- (e.g. of the four venues in a map overlay), the timeline just shows the
-- events and the timezone footer.

insert into public.wedding_schedule_pages (
  wedding_id, venue_photo_url, venue_map_image_urls, venue_map_title,
  venue_map_legend, timezone_note
) values (
  'a0000000-0000-0000-0000-000000000004',
  null,
  '{}'::text[],
  null,
  '[]'::jsonb,
  'All times are Central Standard Time (CST / UTC−6)'
) on conflict (wedding_id) do update set
  -- venue_photo_url and venue_map_* intentionally NOT overwritten on
  -- conflict — once you set them via the dashboard, re-running the seed
  -- shouldn't clobber those. Only the timezone note stays in sync.
  timezone_note = excluded.timezone_note,
  updated_at    = now();
