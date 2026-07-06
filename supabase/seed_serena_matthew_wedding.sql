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


-- ─── Destination Guide ──────────────────────────────────────────────
-- Mexico City content tailored to Serena & Matthew's wedding weekend.
-- Stored as a single row in public.wedding_guides (migration 027) so
-- the Travel tab reads Mexico City content instead of falling back to
-- the bundled SWITZERLAND_FULL_GUIDE constant.
--
-- currency_code = 'MXN' enables the live-FX widget on the currency
-- card. photo_strip is empty here — once you upload photos to the
-- wedding-guide-images bucket (migration 031) via the admin
-- destination-photo editor, they'll appear at the top of the tab.
--
-- The sections / quick_facts / filter_pills JSON below is dollar-quoted
-- ($g$ ... $g$) so apostrophes inside descriptions don't need escaping.

insert into public.wedding_guides (
  wedding_id, page_title, page_subtitle_tag, page_subtitle,
  currency_code, filter_pills, sections, quick_facts, photo_strip
) values (
  'a0000000-0000-0000-0000-000000000004',
  'Mexico City Guide',
  'Ciudad de México & Beyond',
  'Everything you need to know about Mexico City and making the most of your trip.',
  'MXN',
  $g$["All","Transport","Sightseeing","Activity","Restaurant","Bar","Practical"]$g$::jsonb,
  $g$[
    {
      "id": "getting-there",
      "title": "Getting to Mexico City",
      "emoji": "✈️",
      "items": [
        {
          "id": "flights",
          "name": "By Air",
          "category": "Transport",
          "description": "Benito Juárez International Airport (MEX) in the east of the city is the main gateway and is served by direct flights from most major US, Canadian, European, and Latin American hubs. The newer Felipe Ángeles airport (NLU) is ~50 km north — cheaper but a longer transfer. Toluca (TLC) is a smaller option to the west.",
          "tip": "Fly into MEX unless a specific carrier only serves NLU — the transfer from NLU into downtown can take 90+ minutes in traffic."
        },
        {
          "id": "from-airport",
          "name": "From the Airport",
          "category": "Transport",
          "description": "From MEX to the Sofitel Reforma is ~13 km — 25 minutes without traffic, an hour with it. Authorized airport taxis (Porto Taxi, Sitio 300) sell fixed-fare tickets inside the terminal. Uber and Cabify are cheaper (~$15–20 USD) but must be requested from the designated rideshare zones outside the terminals.",
          "tip": "Have your hotel address written down in Spanish — many airport-taxi drivers don't speak English."
        },
        {
          "id": "getting-around",
          "name": "Getting Around Downtown",
          "category": "Transport",
          "description": "Uber and Cabify are ubiquitous, cheap, and safer for late-night runs. Walking the Reforma / Zona Rosa / Centro Histórico corridor is easy in daylight. The Metrobús runs along Reforma with a stop steps from the Sofitel; it's the fastest way to Chapultepec and back.",
          "tip": "Skip regular street taxis — Uber is cheaper, tracked, and the standard for tourists here."
        }
      ]
    },
    {
      "id": "things-to-do",
      "title": "Things to Do",
      "emoji": "🗺️",
      "subsections": [
        {
          "id": "centro-historico",
          "title": "Centro Histórico",
          "emoji": "🏛️",
          "category": "Sightseeing",
          "items": [
            {
              "id": "zocalo",
              "name": "Zócalo & Metropolitan Cathedral",
              "category": "Sightseeing",
              "description": "The vast main square of the city, flanked by the 16th-century Metropolitan Cathedral and the Palacio Nacional. About 15 minutes by car from the Sofitel — walking distance to Ex Convento San Hipólito.",
              "tip": "Climb the cathedral bell tower (small fee) for the best free view of the plaza.",
              "address": "Plaza de la Constitución s/n, Centro, Cuauhtémoc, 06000 Ciudad de México, CDMX"
            },
            {
              "id": "palacio-bellas-artes",
              "name": "Palacio de Bellas Artes",
              "category": "Sightseeing",
              "description": "Art Nouveau exterior, Art Deco interior, and murals by Diego Rivera, Orozco, and Siqueiros. About 10 minutes by car from the Sofitel and right next to Alameda Central park.",
              "tip": "Cross the street to Sears' 8th-floor café for the iconic photo of the palace dome.",
              "address": "Av. Juárez, Centro Histórico, Cuauhtémoc, 06050 Ciudad de México, CDMX"
            },
            {
              "id": "templo-mayor",
              "name": "Templo Mayor",
              "category": "Sightseeing",
              "description": "The excavated Aztec temple complex right behind the cathedral, with an attached museum of artifacts pulled from the site. Allow ~90 minutes.",
              "address": "Seminario 8, Centro Histórico, Cuauhtémoc, 06060 Ciudad de México, CDMX"
            },
            {
              "id": "palacio-nacional",
              "name": "Palacio Nacional & Rivera Murals",
              "category": "Sightseeing",
              "description": "Government seat with a full second-floor staircase covered in Diego Rivera murals telling the history of Mexico. Free entry with ID.",
              "address": "Plaza de la Constitución s/n, Centro, Cuauhtémoc, 06066 Ciudad de México, CDMX"
            }
          ]
        },
        {
          "id": "museums",
          "title": "Museums",
          "emoji": "🖼️",
          "category": "Sightseeing",
          "items": [
            {
              "id": "anthro-museum",
              "name": "Museo Nacional de Antropología",
              "category": "Sightseeing",
              "description": "One of the great museums of the world — pre-Columbian civilizations of Mesoamerica across dozens of halls, plus the famous Sun Stone. In Chapultepec Park, about 10 minutes from the Sofitel.",
              "tip": "Allow at least 3 hours. If tight on time, focus on the Mexica, Maya, and Teotihuacán halls.",
              "address": "Av. Paseo de la Reforma s/n, Chapultepec Polanco, Miguel Hidalgo, 11560 Ciudad de México, CDMX"
            },
            {
              "id": "frida-kahlo",
              "name": "Museo Frida Kahlo (Casa Azul)",
              "category": "Sightseeing",
              "description": "Frida Kahlo's cobalt-blue childhood home in Coyoacán, now a museum of her art, wardrobe, and personal effects. About 30 minutes by car from the Sofitel.",
              "tip": "Buy timed tickets online days in advance — walk-ups often sell out.",
              "links": [
                { "label": "Book tickets", "url": "https://www.museofridakahlo.org.mx/en/" }
              ],
              "address": "Londres 247, Del Carmen, Coyoacán, 04100 Ciudad de México, CDMX"
            },
            {
              "id": "soumaya",
              "name": "Museo Soumaya",
              "category": "Sightseeing",
              "description": "Free-entry museum in a striking mirrored-cloud building in Polanco, holding one of the largest Rodin collections outside France plus European masters.",
              "address": "Blvd. Miguel de Cervantes Saavedra 303, Ampliación Granada, Miguel Hidalgo, 11529 Ciudad de México, CDMX"
            }
          ]
        },
        {
          "id": "neighborhoods",
          "title": "Neighborhoods to Wander",
          "emoji": "🌳",
          "category": "Sightseeing",
          "items": [
            {
              "id": "roma-condesa",
              "name": "Roma Norte & Condesa",
              "category": "Sightseeing",
              "description": "Tree-lined streets, Art Deco buildings, cafés, boutiques, and some of the best restaurants in the city. About 10 minutes by car south of the Sofitel.",
              "tip": "Spend a slow afternoon walking Avenida Álvaro Obregón in Roma Norte and looping back through Parque México in Condesa."
            },
            {
              "id": "coyoacan",
              "name": "Coyoacán",
              "category": "Sightseeing",
              "description": "Cobbled colonial neighborhood in the south with a lively main square, weekend markets, and the Frida Kahlo museum. Pair with lunch at Los Danzantes.",
              "tip": "Try a churro from El Jarocho and a helado from Roxy on the plaza."
            },
            {
              "id": "polanco",
              "name": "Polanco",
              "category": "Sightseeing",
              "description": "Upscale shopping and dining district with Masaryk Avenue as its spine. Home to Pujol and the Soumaya + Jumex museum campus."
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
              "id": "teotihuacan",
              "name": "Teotihuacán Pyramids",
              "category": "Sightseeing",
              "description": "The ancient pre-Aztec city about an hour northeast of downtown — climb the Pyramid of the Sun and walk the Avenue of the Dead. Book a driver or a small-group tour from your hotel; hot-air balloon rides at sunrise are a splurge worth doing.",
              "tip": "Go early to beat the midday sun — there is no shade on the pyramids. Wear sturdy shoes."
            },
            {
              "id": "xochimilco",
              "name": "Xochimilco",
              "category": "Sightseeing",
              "description": "The floating gardens south of the city — hop on a colorful trajinera boat with drinks, tacos, and mariachi bands drifting alongside. Best on a Saturday or Sunday afternoon.",
              "tip": "Split the cost across a group — trajineras rent by the hour, not per person."
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
          "id": "restaurants-food",
          "title": "Restaurants",
          "emoji": "🌮",
          "category": "Restaurant",
          "items": [
            {
              "id": "pujol",
              "name": "Pujol",
              "category": "Restaurant",
              "description": "Enrique Olvera's iconic tasting-menu restaurant in Polanco — one of the most celebrated in Latin America. The mole madre course alone is worth the trip.",
              "tip": "Reservations open a couple of months out and go fast — book as soon as you have flights.",
              "address": "Tennyson 133, Polanco, Polanco IV Secc, Miguel Hidalgo, 11550 Ciudad de México, CDMX"
            },
            {
              "id": "contramar",
              "name": "Contramar",
              "category": "Restaurant",
              "description": "Legendary Roma Norte seafood lunch spot — the tuna tostadas and pescado a la talla are the signature dishes. Long, loud, and unforgettable.",
              "tip": "Lunch only, no dinner. Go with a group and share; walk-ins possible but reservations save the wait.",
              "address": "Calle de Durango 200, Roma Nte., Cuauhtémoc, 06700 Ciudad de México, CDMX"
            },
            {
              "id": "rosetta",
              "name": "Rosetta",
              "category": "Restaurant",
              "description": "Elena Reygadas' Italian-Mexican menu in a beautiful old Roma Norte mansion. The attached Panadería Rosetta up the street does the best pastries in town.",
              "address": "Colima 166, Roma Nte., Cuauhtémoc, 06700 Ciudad de México, CDMX"
            },
            {
              "id": "maximo-bistrot",
              "name": "Máximo Bistrot",
              "category": "Restaurant",
              "description": "Farm-to-table French-Mexican tasting menu from Eduardo García. Small, warm, and consistently one of the best meals in the city.",
              "address": "Av. Álvaro Obregón 65B, Roma Nte., Cuauhtémoc, 06700 Ciudad de México, CDMX"
            },
            {
              "id": "el-cardenal",
              "name": "El Cardenal",
              "category": "Restaurant",
              "description": "Classic Mexican breakfast institution downtown — try the chilaquiles, the fresh sweet breads, and the hot chocolate. Multiple locations; the Centro one is a short walk from the Zócalo.",
              "address": "Palma 23, Centro Histórico, Cuauhtémoc, 06000 Ciudad de México, CDMX"
            }
          ]
        },
        {
          "id": "bars",
          "title": "Bars & Nightlife",
          "emoji": "🍸",
          "category": "Bar",
          "items": [
            {
              "id": "handshake",
              "name": "Handshake Speakeasy",
              "category": "Bar",
              "description": "Zona Rosa cocktail bar consistently ranked among the world's 50 best. Reservations essential.",
              "address": "Amberes 65, Juárez, Cuauhtémoc, 06600 Ciudad de México, CDMX"
            },
            {
              "id": "limantour",
              "name": "Licorería Limantour",
              "category": "Bar",
              "description": "Roma Norte cocktail landmark — sit at the bar and let them make you the drink you didn't know you wanted.",
              "address": "Av. Álvaro Obregón 106, Roma Nte., Cuauhtémoc, 06700 Ciudad de México, CDMX"
            },
            {
              "id": "hanky-panky",
              "name": "Hanky Panky",
              "category": "Bar",
              "description": "Hidden-entrance speakeasy in Juárez — you'll need a text-message reservation to get past the front door.",
              "address": "Turín 63, Juárez, Cuauhtémoc, 06600 Ciudad de México, CDMX"
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
          "name": "Weather in November",
          "category": "Practical",
          "description": "Dry season is in full swing — warm sunny days (~70°F / 22°C highs) and crisp evenings (~50°F / 10°C lows). Almost no rain.",
          "tip": "Pack layers for the evening — a light jacket or shawl for outdoor dinners is a good call."
        },
        {
          "id": "altitude",
          "name": "Altitude",
          "category": "Practical",
          "description": "Mexico City sits at 2,240 m (7,350 ft). Most people feel it a bit on day one — mild headache or shortness of breath climbing stairs.",
          "tip": "Take it easy on alcohol the first night, drink more water than usual, and skip the hardest workouts on arrival day."
        },
        {
          "id": "timezone",
          "name": "Time Zone",
          "category": "Practical",
          "description": "Central Standard Time (CST, UTC−6) year-round — Mexico abolished daylight saving in 2022. One hour behind the US East Coast in November."
        },
        {
          "id": "language",
          "name": "Language",
          "category": "Practical",
          "description": "Spanish is the language of the city. English is spoken at hotels, upmarket restaurants, and by many rideshare drivers, but far from universal. A few basic phrases go a long way.",
          "tip": "Have your destination written down in Spanish for taxis, and let Google Translate's camera mode do the heavy lifting on menus."
        },
        {
          "id": "currency",
          "name": "Currency",
          "category": "Practical",
          "description": "Mexican Peso (MXN). Cards are widely accepted at hotels, restaurants, and bars, but bring pesos for markets, taxis, tips, and street food. ATMs at bank branches give the best rate."
        },
        {
          "id": "plug",
          "name": "Plug Type",
          "category": "Practical",
          "description": "Type A / Type B sockets, 127V, 60Hz — the same as the US and Canada. International guests from Europe / India / UK need an adaptor, and dual-voltage on any hair or grooming tools."
        },
        {
          "id": "water",
          "name": "Tap Water",
          "category": "Practical",
          "description": "Don't drink the tap water — stick to bottled or filtered. Every hotel provides bottled water and most restaurants only serve filtered water. Ice at reputable venues is made from filtered water and is safe."
        },
        {
          "id": "safety",
          "name": "Getting Around Safely",
          "category": "Practical",
          "description": "The Reforma / Roma / Condesa / Polanco / Centro Histórico corridor is safe for daytime walking. At night, use Uber or Cabify rather than street taxis, and avoid flashing expensive phones or jewelry on the metro."
        },
        {
          "id": "emergency",
          "name": "Emergency Numbers",
          "category": "Practical",
          "description": "911 for police, fire, or ambulance — the same number as the US. Tourist assistance (English-speaking) is available via the CAPTA line at +52 55 5250 0123."
        }
      ]
    }
  ]$g$::jsonb,
  $g$[
    {"key": "Weather (Nov)", "value": "Sunny · 50–70°F"},
    {"key": "Time zone",     "value": "CST (UTC−6)"},
    {"key": "Currency",      "value": "Mexican Peso ($)"},
    {"key": "Language",      "value": "Spanish"},
    {"key": "Plug type",     "value": "Type A / B · 127V"},
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
  -- photo_strip intentionally NOT overwritten on conflict so photos
  -- uploaded via the admin destination-photo editor aren't clobbered by
  -- re-running this seed.
  updated_at        = now();


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
