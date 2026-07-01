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
-- All three per-wedding content tabs now read from DB tables (added
-- in migrations 026 / 027 / 028 and seeded below):
--   * Schedule       → public.wedding_events
--   * Destination    → public.wedding_guides
--   * Packing list   → public.wedding_packing_lists
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


-- ─── Destination Guide ───────────────────────────────────────────────────────
-- Laguna Niguel / Orange County content tailored to Arjun & Ila's wedding.
-- Stored as a single wedding_guides row (migration 027). currency_code is
-- left null — this is a domestic US wedding and the live-FX widget isn't
-- relevant. photo_strip is empty for now; upload Ritz / coast photos to the
-- wedding-hero-images bucket (or a separate bucket) and update the row to
-- show them.
--
-- The sections / quick_facts / filter_pills JSON below is dollar-quoted
-- ($g$ ... $g$) so apostrophes inside descriptions don't need escaping.

insert into public.wedding_guides (
  wedding_id, page_title, page_subtitle_tag, page_subtitle,
  currency_code, filter_pills, sections, quick_facts, photo_strip
) values (
  'a0000000-0000-0000-0000-000000000003',
  'Laguna Niguel Guide',
  'Orange County & Beyond',
  'Everything you need to know about Laguna Niguel and making the most of your trip.',
  null,
  $g$["All","Transport","Sightseeing","Activity","Restaurant","Bar","Practical"]$g$::jsonb,
  $g$[
    {
      "id": "getting-there",
      "title": "Getting to Laguna Niguel",
      "emoji": "✈️",
      "items": [
        {
          "id": "flights",
          "name": "By Air",
          "category": "Transport",
          "description": "John Wayne Airport (SNA) in Santa Ana is the closest — about a 25-minute drive to the Ritz-Carlton. Los Angeles International (LAX) is another option but expect 1.5 hours or more depending on traffic. Long Beach (LGB) and San Diego (SAN) are smaller alternatives.",
          "tip": "Flying into SNA usually means a shorter, less stressful drive than LAX — worth a small price premium."
        },
        {
          "id": "by-car",
          "name": "By Car",
          "category": "Transport",
          "description": "Southern California is car country. Rentals are available at all airports. From SNA take the 405 South to the 73 South — about 25 minutes. From LAX take the 405 South to the 73 South — 1–2 hours depending on traffic.",
          "tip": "Avoid driving back to LAX between 3 PM and 7 PM — traffic on the 405 is brutal."
        },
        {
          "id": "rideshare",
          "name": "Rideshare",
          "category": "Transport",
          "description": "Uber and Lyft operate throughout Orange County, including pickup at SNA and LAX. From SNA expect ~$50–70; from LAX ~$100–150 depending on time of day and surge pricing."
        }
      ]
    },
    {
      "id": "things-to-do",
      "title": "Things to Do",
      "emoji": "🗺️",
      "subsections": [
        {
          "id": "beaches-coast",
          "title": "Beaches & Coast",
          "emoji": "🏖️",
          "category": "Sightseeing",
          "items": [
            {
              "id": "salt-creek",
              "name": "Salt Creek Beach",
              "category": "Sightseeing",
              "description": "Right below the Ritz-Carlton. Public beach with reliable surf and a long sandy stretch — hotel guests can walk straight down. Lifeguards on duty through summer.",
              "tip": "The pathway down from the Ritz is steep — wear shoes you can comfortably walk down a bluff in.",
              "address": "33333 S Pacific Coast Hwy, Dana Point, CA 92629"
            },
            {
              "id": "dana-point-harbor",
              "name": "Dana Point Harbor",
              "category": "Sightseeing",
              "description": "Working marina with restaurants, cafés, and walking paths. Sailboat charters, whale-watching tours, and harbor cruises all depart here. About 5 minutes by car from the Ritz.",
              "tip": "Catch sunset from the breakwater — no crowds, just sailboats and pelicans.",
              "address": "34571 Golden Lantern, Dana Point, CA 92629"
            },
            {
              "id": "crystal-cove",
              "name": "Crystal Cove State Park",
              "category": "Sightseeing",
              "description": "Three miles of beach, tidepools, and bluff trails — plus the historic Crystal Cove cottages built in the 1920s and 30s. About 15 minutes north of the Ritz.",
              "tip": "Beachcomber Café inside the park is a beloved brunch spot — go early or expect a wait.",
              "address": "8471 N Coast Hwy, Laguna Beach, CA 92651"
            },
            {
              "id": "laguna-beach-downtown",
              "name": "Downtown Laguna Beach",
              "category": "Sightseeing",
              "description": "Art galleries, boutiques, oceanfront cafés, and the Heisler Park bluff walk. About 15 minutes from the Ritz.",
              "tip": "Stop at Main Beach for the lifeguard-tower photo — it is one of the most photographed spots in SoCal."
            }
          ]
        },
        {
          "id": "activities",
          "title": "Activities",
          "emoji": "🏄",
          "category": "Activity",
          "items": [
            {
              "id": "surfing",
              "name": "Surfing Lessons",
              "category": "Activity",
              "description": "Salt Creek and Doheny State Beach are both beginner-friendly. Local surf schools offer 1.5-hour lessons with boards and wetsuits included.",
              "tip": "Doheny is the gentlest break for first-timers."
            },
            {
              "id": "whale-watching",
              "name": "Whale Watching",
              "category": "Activity",
              "description": "Dana Wharf Whale Watching runs daily tours from Dana Point Harbor. September is the tail end of blue-whale season — dolphins are almost guaranteed, whales most days.",
              "tip": "Take a morning tour: the ocean is calmer and the wildlife more active.",
              "links": [
                { "label": "Dana Wharf Sportfishing & Whale Watching", "url": "https://danawharf.com/" }
              ]
            },
            {
              "id": "ritz-spa",
              "name": "Ritz-Carlton Spa",
              "category": "Activity",
              "description": "On-property spa with massages, facials, and a steam-and-sauna circuit. Treatments often book a few days out.",
              "tip": "Book before you arrive — wedding-weekend appointments fill up fast."
            },
            {
              "id": "ritz-pools",
              "name": "Ritz-Carlton Pools",
              "category": "Activity",
              "description": "Three oceanfront pools with cabana service. The hilltop adult pool has the best views; the family pool sits closer to the lawn."
            }
          ]
        },
        {
          "id": "day-trips",
          "title": "Day Trips",
          "emoji": "🚗",
          "category": "Sightseeing",
          "items": [
            {
              "id": "disneyland",
              "name": "Disneyland",
              "category": "Sightseeing",
              "description": "About 45 minutes north on the 5. Two parks (Disneyland and California Adventure) plus Downtown Disney. A full day each.",
              "tip": "Buy tickets in advance through the Disneyland app, reserve a park, and add Genie+ for skip-the-line passes."
            },
            {
              "id": "san-diego",
              "name": "San Diego",
              "category": "Sightseeing",
              "description": "Roughly 1.5 hours south. Balboa Park, the Gaslamp Quarter, the Coronado ferry, and the world-famous San Diego Zoo. An easy day trip with an early start."
            }
          ]
        }
      ]
    },
    {
      "id": "restaurants",
      "title": "Eating & Drinking",
      "emoji": "🍽️",
      "subsections": [
        {
          "id": "at-the-ritz",
          "title": "At the Ritz",
          "emoji": "🍷",
          "category": "Restaurant",
          "items": [
            {
              "id": "raya",
              "name": "Raya",
              "category": "Restaurant",
              "description": "Coastal Mexican by Richard Sandoval, set right above the bluff. Modern Mexican plates and an ocean-view patio.",
              "tip": "Sit on the patio for sunset cocktails."
            },
            {
              "id": "eno",
              "name": "ENO Wine, Cheese & Chocolate",
              "category": "Bar",
              "description": "A small tasting bar on the hotel's main level — perfect for a relaxed drink and a cheese flight after dinner."
            }
          ]
        },
        {
          "id": "around-town",
          "title": "Around Town",
          "emoji": "🍴",
          "category": "Restaurant",
          "items": [
            {
              "id": "selanne-steak",
              "name": "Selanne Steak Tavern",
              "category": "Restaurant",
              "description": "Upscale steakhouse from former NHL star Teemu Selänne in downtown Laguna Beach. Reservations strongly recommended.",
              "address": "1464 S Coast Hwy, Laguna Beach, CA 92651"
            },
            {
              "id": "the-deck",
              "name": "The Deck on Laguna Beach",
              "category": "Restaurant",
              "description": "Coastal California cuisine on a beachfront deck in Laguna Beach. Fish tacos at lunch, sunset cocktails at dinner.",
              "address": "627 Sleepy Hollow Ln, Laguna Beach, CA 92651"
            },
            {
              "id": "sapphire-laguna",
              "name": "Sapphire Laguna",
              "category": "Restaurant",
              "description": "Globally inspired California cuisine in a historic 1920s building in downtown Laguna Beach.",
              "address": "1200 S Coast Hwy, Laguna Beach, CA 92651"
            },
            {
              "id": "the-cellar",
              "name": "The Cellar",
              "category": "Bar",
              "description": "Cozy underground wine bar in San Clemente with a strong by-the-glass list and small plates.",
              "address": "156 Avenida Del Mar Suite 1, San Clemente, CA 92672"
            }
          ]
        }
      ]
    },
    {
      "id": "practical",
      "title": "Practical Info",
      "emoji": "💡",
      "items": [
        {
          "id": "weather",
          "name": "Weather in September",
          "category": "Practical",
          "description": "Warm and dry. Daytime highs 75–80°F, evenings cool to 60–65°F. Marine layer (low coastal fog) is common in the early morning and clears by mid-morning.",
          "tip": "Pack a light layer for evenings on the bluff — it can be breezy and 15°F cooler than the afternoon."
        },
        {
          "id": "timezone",
          "name": "Time Zone",
          "category": "Practical",
          "description": "Pacific Daylight Time (PDT, UTC−7) through early November. Three hours behind the East Coast."
        },
        {
          "id": "tipping",
          "name": "Tipping",
          "category": "Practical",
          "description": "Standard US tipping: 15–20% at restaurants and bars, $1–$2 per drink at counter service, $5–$10 per night for hotel housekeeping, ~15% for rideshares.",
          "tip": "Most restaurant checks have suggested tip amounts printed at the bottom — handy guide."
        },
        {
          "id": "driving",
          "name": "Driving",
          "category": "Practical",
          "description": "Driving is on the right. Right turn on red is permitted unless posted otherwise. The 73 is a toll road running north from Laguna Niguel toward Newport — about $8 each way if you take it back to SNA or LAX."
        },
        {
          "id": "plug",
          "name": "Plug Type",
          "category": "Practical",
          "description": "Type A / Type B sockets. 120V, 60Hz. International guests with 220V appliances should check for dual-voltage compatibility or pack a converter."
        },
        {
          "id": "emergency",
          "name": "Emergency Numbers",
          "category": "Practical",
          "description": "911 for police, fire, or ambulance. The nearest hospitals are Saddleback Memorial in Laguna Hills and Mission Hospital in Mission Viejo — both about 15 minutes from the Ritz."
        },
        {
          "id": "water",
          "name": "Tap Water",
          "category": "Practical",
          "description": "Tap water is safe to drink throughout California."
        }
      ]
    }
  ]$g$::jsonb,
  $g$[
    {"key": "Weather (Sep)", "value": "Sunny · 65–80°F"},
    {"key": "Time zone",     "value": "PDT (UTC−7)"},
    {"key": "Currency",      "value": "US Dollar ($)"},
    {"key": "Tipping",       "value": "15–20% at restaurants"},
    {"key": "Plug type",     "value": "Type A / B · 120V"},
    {"key": "Emergency",     "value": "911"}
  ]$g$::jsonb,
  $g$[]$g$::jsonb
) on conflict (wedding_id) do update set
  page_title        = excluded.page_title,
  page_subtitle_tag = excluded.page_subtitle_tag,
  page_subtitle     = excluded.page_subtitle,
  currency_code     = excluded.currency_code,
  filter_pills      = excluded.filter_pills,
  sections          = excluded.sections,
  quick_facts       = excluded.quick_facts,
  -- photo_strip intentionally NOT overwritten on conflict so a value set
  -- via the dashboard isn't clobbered by re-running this seed.
  updated_at        = now();


-- ─── Packing List ────────────────────────────────────────────────────────────
-- Laguna Niguel / Orange County / Indian + black-tie packing content
-- tailored to Arjun & Ila's weekend. Stored as a single row in
-- public.wedding_packing_lists (migration 028).
--
-- categories JSON items support these client-side visibility flags:
--   * weddingPartyOnly   — only shown to wedding-party guests
--   * excludeWeddingParty — hidden from wedding-party guests
--   * bridalPartyOnly    — only shown to bridesmaids/bridesman
--   * excludeBridalParty  — hidden from bridesmaids/bridesman
--   * gender ('male' | 'female') — only shown to guests of that gender
-- When gender is unknown on the guest row, all items show.

insert into public.wedding_packing_lists (
  wedding_id, page_title, page_subtitle_tag, page_subtitle,
  completion_message, categories, tip_footer
) values (
  'a0000000-0000-0000-0000-000000000003',
  'Packing Guide',
  'What to Bring',
  'Outfit ideas and everything you need for a Southern California wedding weekend.',
  $g$You're all packed! See you at the Ritz-Carlton!$g$,
  $g$[
    {
      "id": "outfits",
      "title": "Outfits",
      "emoji": "👗",
      "items": [
        {
          "id": "sangeet-outfit-female",
          "label": "Sangeet outfit",
          "tip": "Vibrant and festive Indian attire — lehenga, saree, salwar kameez, or a colorful cocktail dress. Come ready to dance!",
          "gender": "female"
        },
        {
          "id": "sangeet-outfit-male",
          "label": "Sangeet outfit",
          "tip": "Vibrant and festive Indian attire — sherwani, kurta, or bandhgala. Come ready to dance!",
          "gender": "male"
        },
        {
          "id": "baraat-outfit-female",
          "label": "Baraat outfit",
          "tip": "Festive Indian attire, a touch more relaxed than the ceremony — lehenga, saree, or salwar kameez.",
          "gender": "female"
        },
        {
          "id": "baraat-outfit-male",
          "label": "Baraat outfit",
          "tip": "Festive Indian attire — kurta, sherwani, or bandhgala.",
          "gender": "male"
        },
        {
          "id": "ceremony-outfit-female",
          "label": "Ceremony & Reception outfit",
          "tip": "Indian formal or black-tie. Floor-length gown, saree, or lehenga.",
          "gender": "female"
        },
        {
          "id": "ceremony-outfit-male",
          "label": "Ceremony & Reception outfit",
          "tip": "Black-tie: tuxedo or black suit. Or Indian formal: sherwani or bandhgala.",
          "gender": "male"
        },
        {
          "id": "casual-outfits",
          "label": "Casual outfits for the beach and sightseeing (1–2)"
        },
        {
          "id": "swimsuit-female",
          "label": "Swimsuit for the Ritz pools and hot tub",
          "gender": "female"
        },
        {
          "id": "swim-trunks-male",
          "label": "Swim trunks for the Ritz pools and hot tub",
          "gender": "male"
        },
        {
          "id": "travel-outfit",
          "label": "Comfortable travel outfit"
        }
      ]
    },
    {
      "id": "footwear",
      "title": "Footwear",
      "emoji": "👠",
      "items": [
        {
          "id": "sangeet-shoes-female",
          "label": "Comfortable heels or flats for the Sangeet",
          "tip": "You'll be dancing all night — choose shoes you can move in.",
          "gender": "female"
        },
        {
          "id": "sangeet-shoes-male",
          "label": "Comfortable shoes for the Sangeet",
          "tip": "Dressy but comfortable — you'll be on your feet all night.",
          "gender": "male"
        },
        {
          "id": "baraat-shoes",
          "label": "Comfortable shoes for the Baraat",
          "tip": "The Baraat is outdoors on grass and involves a procession — flats, wedges, or dress shoes you can move in."
        },
        {
          "id": "ceremony-shoes-female",
          "label": "Ceremony & Reception shoes",
          "tip": "The ceremony is on an outdoor lawn — wedges or block heels won't sink into the grass the way stilettos do.",
          "gender": "female"
        },
        {
          "id": "ceremony-shoes-male",
          "label": "Ceremony & Reception dress shoes",
          "tip": "Polished black or oxblood pairs well with a tux or dark suit.",
          "gender": "male"
        },
        {
          "id": "sandals",
          "label": "Sandals or flip-flops for the beach and pool"
        },
        {
          "id": "walking-shoes",
          "label": "Comfortable walking shoes for sightseeing"
        }
      ]
    },
    {
      "id": "weather-essentials",
      "title": "Southern California Essentials",
      "emoji": "☀️",
      "items": [
        {
          "id": "sunglasses",
          "label": "Sunglasses"
        },
        {
          "id": "sunscreen",
          "label": "Sunscreen",
          "tip": "The ceremony is outdoors at noon on the Bluffs Lawn — apply generously before the ceremony."
        },
        {
          "id": "light-layer",
          "label": "Light jacket, shawl, or pashmina",
          "tip": "Ocean-front evenings in September can get breezy and 10–15°F cooler than the afternoon."
        },
        {
          "id": "hair-clip-female",
          "label": "Hair tie or clip for the outdoor ceremony",
          "tip": "The Bluffs Lawn can be windy — a clip or spray keeps things in place for photos.",
          "gender": "female"
        },
        {
          "id": "reusable-water-bottle",
          "label": "Reusable water bottle",
          "tip": "Southern California is dry — easy to under-hydrate on a warm September day."
        }
      ]
    },
    {
      "id": "attire-extras",
      "title": "Attire Extras",
      "emoji": "✨",
      "items": [
        {
          "id": "jewelry",
          "label": "Jewelry for each event",
          "gender": "female"
        },
        {
          "id": "safety-pins",
          "label": "Safety pins (essential if wearing a saree)",
          "gender": "female"
        },
        {
          "id": "fashion-tape",
          "label": "Double-sided fashion tape",
          "gender": "female"
        },
        {
          "id": "bindi",
          "label": "Bindis and hair accessories",
          "gender": "female"
        },
        {
          "id": "bangles",
          "label": "Bangles",
          "gender": "female"
        },
        {
          "id": "clutch",
          "label": "Small clutch or evening bag",
          "gender": "female"
        },
        {
          "id": "bow-tie",
          "label": "Bow tie or tie",
          "gender": "male"
        },
        {
          "id": "cufflinks",
          "label": "Cufflinks",
          "gender": "male"
        },
        {
          "id": "belt",
          "label": "Belt",
          "gender": "male"
        }
      ]
    },
    {
      "id": "grooming",
      "title": "Grooming & Personal Care",
      "emoji": "💄",
      "items": [
        { "id": "toothbrush", "label": "Toothbrush" },
        { "id": "toothpaste", "label": "Toothpaste" },
        { "id": "deodorant",  "label": "Deodorant" },
        {
          "id": "makeup-kit",
          "label": "Makeup",
          "gender": "female"
        },
        {
          "id": "makeup-remover",
          "label": "Makeup remover wipes",
          "gender": "female"
        },
        {
          "id": "hair-styling",
          "label": "Hair styling tools (curler / straightener)",
          "tip": "US outlets are 120V — dual-voltage tools work as-is; single-voltage tools from Europe or India need a converter, not just an adaptor.",
          "gender": "female"
        },
        {
          "id": "shaving-kit",
          "label": "Shaving kit",
          "gender": "male"
        }
      ]
    },
    {
      "id": "essentials",
      "title": "Travel Essentials",
      "emoji": "🧳",
      "items": [
        {
          "id": "id-passport",
          "label": "Photo ID (US guests) or passport (international)",
          "tip": "TSA now requires REAL ID-compliant licenses for US domestic flights. Passports work too."
        },
        {
          "id": "us-plug-adaptor",
          "label": "US plug adaptor (international guests only)",
          "tip": "US outlets are Type A / Type B, 120V. Bring a converter too if your electronics aren't dual-voltage."
        },
        { "id": "phone-charger",  "label": "Phone charger" },
        {
          "id": "battery-pack",
          "label": "Portable battery pack",
          "tip": "Handy for long days at the beach, at the pool, or day-tripping to Disneyland."
        },
        { "id": "meds",           "label": "Personal medications" }
      ]
    }
  ]$g$::jsonb,
  $g${
    "title": "Tip: Pack for sun by day, ocean breeze by night",
    "text": "September in Laguna Niguel is warm and dry during the day but can be cool and windy in the evening. Pack a light layer for the outdoor ceremony and evening events by the water, and don't forget sunscreen for the noon Bluffs Lawn ceremony."
  }$g$::jsonb
) on conflict (wedding_id) do update set
  page_title         = excluded.page_title,
  page_subtitle_tag  = excluded.page_subtitle_tag,
  page_subtitle      = excluded.page_subtitle,
  completion_message = excluded.completion_message,
  categories         = excluded.categories,
  tip_footer         = excluded.tip_footer,
  updated_at         = now();


-- ─── Schedule Page Overrides ─────────────────────────────────────────────────
-- Sets the PDT timezone footer under the schedule timeline. venue_photo_url
-- and venue_map_image_url are left null — until you upload a Ritz-Carlton
-- exterior photo and (optionally) a venue map, the timeline just shows the
-- events and the timezone footer, no photo or map card.
--
-- To add a venue photo later:
--   1. Upload to the wedding-venue-images bucket (migration 030) at
--      a0000000-0000-0000-0000-000000000003/venue.jpg
--   2. update public.wedding_schedule_pages
--        set venue_photo_url = 'https://.../wedding-venue-images/.../venue.jpg'
--        where wedding_id = 'a0000000-0000-0000-0000-000000000003';
-- Same idea for a Ritz-Carlton floor plan → venue_map_image_url.

insert into public.wedding_schedule_pages (
  wedding_id, venue_photo_url, venue_map_image_url, venue_map_title,
  venue_map_legend, timezone_note
) values (
  'a0000000-0000-0000-0000-000000000003',
  null,
  null,
  null,
  '[]'::jsonb,
  'All times are Pacific Daylight Time (PDT / UTC−7)'
) on conflict (wedding_id) do update set
  -- venue_photo_url and venue_map_* intentionally NOT overwritten on
  -- conflict — once you set them via the dashboard, re-running the seed
  -- shouldn't clobber those. Only the timezone note stays in sync.
  timezone_note = excluded.timezone_note,
  updated_at    = now();
