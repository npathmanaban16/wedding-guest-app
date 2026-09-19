-- ============================================================
-- Tetherly — Sachi & Rahul Demo Wedding Seed
-- ============================================================
-- Pitch demo for a prospective couple (Sachi Pathak & Rahul Sharma),
-- getting married over three days in May 2027 on Beech Mountain,
-- North Carolina — the Overlook Barn property near Banner Elk:
--   * Thu 6 May 2027 — Mehendi at the Mountain House, 6:00 PM
--   * Fri 7 May 2027 — Haldi at Mary's Meadow, 10:00 AM
--   * Fri 7 May 2027 — Sangeet & Garba at Overlook Barn, 6:00 PM
--   * Sat 8 May 2027 — Wedding at Mary's Meadow, 12:30 PM
--   * Sat 8 May 2027 — Cocktail hour at Cliffside Barn, 5:00 PM
--   * Sat 8 May 2027 — Reception at Overlook Barn, doors 6:15 PM
--
-- Run this in the SaaS Supabase project's Database → SQL Editor.
-- Safe to run alongside seed_demo_wedding.sql, seed_saas.sql,
-- seed_arjun_ila_wedding.sql and seed_serena_matthew_wedding.sql —
-- this seeds a new independent wedding row with a fresh UUID and
-- invite code, so it doesn't touch any existing tenant data.
--
-- Tenant id:      a0000000-0000-0000-0000-000000000005
--                 (one higher than the Serena & Matthew seed for easy
--                  spotting / deletion)
-- Invite code:    SACHIRAHUL2027
-- Admin logins:   Sachi Pathak, Rahul Sharma  (both seeded as admins)
-- Admin password: SachiRahul   (home-tab admin unlock)
-- Henna artists:  Priya Nair, Meera Joshi (role='henna_artist') —
--                 placeholder names; swap once the real artists are
--                 booked. They share one station and queue.
--
-- Placeholders to update once Sachi confirms details:
--   * planner_name is null — the Announcements composer only offers
--     "send as the planner" when this is set. One-liner once you have
--     the name:
--       update public.weddings set planner_name = 'Jordan'
--         where id = 'a0000000-0000-0000-0000-000000000005';
--   * End times. Sachi gave start times only, so every event carries
--     end_at = null and clients fall back to a 1-hour calendar block.
--     Fill in end_at per event once the timeline is locked.
--   * Mountain House address. Mary's Meadow, Cliffside Barn and
--     Overlook Barn are all on the Overlook Barn property at 830
--     Elderberry Ridge Road; the Mountain House is seeded against the
--     same address so map links land on the property. Correct it if
--     it turns out to be a separate address.
--   * hero_image_url is null — the home tab falls back to the bundled
--     montreux.png (a Swiss castle, obviously wrong for a Blue Ridge
--     wedding). Upload a Beech Mountain / Overlook Barn photo to the
--     wedding-hero-images bucket and set the URL BEFORE pitching.
--   * contact_email points at Neha's personal Gmail (the Resend
--     free-tier signup address) so notification emails fired from the
--     demo actually deliver; swap to the couple's shared inbox before
--     any of this reaches real guests.
--
-- Idempotent: safe to re-run. Wedding / guests / admins / info rows
-- no-op or upsert on conflict. Song requests and the welcome
-- notification are wiped for THIS wedding only and re-inserted.
-- ============================================================


-- ─── Wedding row ─────────────────────────────────────────────────────────────
-- wedding_date is the Saturday ceremony start (12:30 PM) so the home-screen
-- countdown lands on the wedding itself rather than the Mehendi. North
-- Carolina is on Eastern Daylight Time (EDT, UTC−4) in May, so 12:30 PM EDT
-- on Sat 8 May 2027 = 2027-05-08T16:30:00Z.

insert into public.weddings (
  id, invite_code, couple_names, wedding_date, location, destination_city,
  hashtag, website, contact_email, registry_url, hero_image_url,
  theme_color, planner_name, photo_album_url, admin_password
) values (
  'a0000000-0000-0000-0000-000000000005',
  'SACHIRAHUL2027',
  'Sachi & Rahul',
  '2027-05-08T16:30:00Z',
  'Overlook Barn, Beech Mountain',
  'Banner Elk',
  '#SachiAndRahul2027',
  'https://example.com/sachi-and-rahul',
  'neha.pathmanaban.2016@gmail.com',
  'https://example.com/registry',
  null,
  '#6B7F5E',
  null,
  'https://example.com/photos',
  'SachiRahul'
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
  photo_album_url  = excluded.photo_album_url,
  admin_password   = excluded.admin_password;
  -- hero_image_url and planner_name intentionally NOT overwritten on
  -- conflict so values set via the dashboard aren't clobbered by a re-run.


-- ─── Guests ──────────────────────────────────────────────────────────────────
-- Demo attendee list in the shape of a real Indian-American wedding roster:
-- family from both sides, college and work friends, and a few plus-ones
-- across backgrounds. Sachi Pathak and Rahul Sharma are is_couple=true so
-- the Attendees directory hides them from the "who's here" grid; they also
-- carry admin access via wedding_admins below.
--
-- wedding_party_role drives the Attendees display:
--   * bridesmaid / groomsman → "Wedding party" badge, sorted to the top.
--   * 'partner' (Elena Vasquez, Daniel Okafor's plus-one) keeps
--     is_wedding_party=true for access to wedding-party events but
--     suppresses the badge and sorts with regular attendees.
--   * NULL on a non-wedding-party guest is just a regular attendee.
--
-- On-conflict UPDATE (rather than DO NOTHING) so a re-run corrects flags on
-- existing rows. profile_photo_url and bio are guest-set on-device and
-- intentionally not touched here.

insert into public.guests
  (wedding_id, canonical_name, is_wedding_party, is_couple, gender, wedding_party_role) values
  ('a0000000-0000-0000-0000-000000000005', 'Sachi Pathak',     true,  true,  'female', null),
  ('a0000000-0000-0000-0000-000000000005', 'Rahul Sharma',     true,  true,  'male',   null),
  ('a0000000-0000-0000-0000-000000000005', 'Nisha Pathak',     true,  false, 'female', 'bridesmaid'),
  ('a0000000-0000-0000-0000-000000000005', 'Megha Trivedi',    true,  false, 'female', 'bridesmaid'),
  ('a0000000-0000-0000-0000-000000000005', 'Karan Sharma',     true,  false, 'male',   'groomsman'),
  ('a0000000-0000-0000-0000-000000000005', 'Daniel Okafor',    true,  false, 'male',   'groomsman'),
  ('a0000000-0000-0000-0000-000000000005', 'Elena Vasquez',    true,  false, 'female', 'partner'),
  ('a0000000-0000-0000-0000-000000000005', 'Dilip Pathak',     false, false, 'male',   null),
  ('a0000000-0000-0000-0000-000000000005', 'Hetal Pathak',     false, false, 'female', null),
  ('a0000000-0000-0000-0000-000000000005', 'Anita Desai',      false, false, 'female', null),
  ('a0000000-0000-0000-0000-000000000005', 'Sameer Rao',       false, false, 'male',   null),
  ('a0000000-0000-0000-0000-000000000005', 'Grace Whitfield',  false, false, 'female', null),
  ('a0000000-0000-0000-0000-000000000005', 'Jun-ho Park',      false, false, 'male',   null),
  ('a0000000-0000-0000-0000-000000000005', 'Farah Siddiqui',   false, false, 'female', null)
on conflict (wedding_id, canonical_name) do update set
  is_wedding_party   = excluded.is_wedding_party,
  is_couple          = excluded.is_couple,
  gender             = excluded.gender,
  wedding_party_role = excluded.wedding_party_role;


-- ─── Wedding Admins ──────────────────────────────────────────────────────────

insert into public.wedding_admins (wedding_id, guest_name) values
  ('a0000000-0000-0000-0000-000000000005', 'Sachi Pathak'),
  ('a0000000-0000-0000-0000-000000000005', 'Rahul Sharma')
on conflict (wedding_id, guest_name) do nothing;

-- Henna artist vendor logins (role='henna_artist'). Login-only, no admin
-- powers; lands on /henna-artist after signing in. Two artists share one
-- station and queue — each gets her own chair on the artist screen but
-- both pull from the same waiting list. Worth demoing on Sunday: the
-- Mehendi is Sachi's first event, so the waitlist is the feature that
-- stops forty guests crowding one artist's table.
insert into public.wedding_admins
  (wedding_id, guest_name, is_wedding_party, gender, role)
values
  ('a0000000-0000-0000-0000-000000000005', 'Priya Nair',  true, 'female', 'henna_artist'),
  ('a0000000-0000-0000-0000-000000000005', 'Meera Joshi', true, 'female', 'henna_artist')
on conflict (wedding_id, guest_name) do update set
  is_wedding_party = excluded.is_wedding_party,
  gender           = excluded.gender,
  role             = excluded.role;

-- Henna station — starts closed. Either artist can toggle it open from her
-- queue screen when henna is ready for guests. display_name left null so the
-- guest UI falls back to the generic "Henna waitlist" heading rather than
-- singling out one of the two artists.
insert into public.henna_stations (wedding_id, is_open, display_name)
values ('a0000000-0000-0000-0000-000000000005', false, null)
on conflict (wedding_id) do update set display_name = excluded.display_name;


-- ─── Guest Info ──────────────────────────────────────────────────────────────
-- Pre-fill meal selections + dietary for a few guests so the Details tab has
-- realistic read-only data to display during the demo.

insert into public.guest_info
  (wedding_id, guest_name, dietary, meal_1, meal_2, meal_3, rehearsal_dinner, email)
values
  ('a0000000-0000-0000-0000-000000000005', 'Sachi Pathak', '',
    'Roasted Beet & Goat Cheese Salad', 'Paneer Makhani (Vegetarian)',
    'Warm Apple Crumble', true, 'sachi.demo@tetherly.app'),
  ('a0000000-0000-0000-0000-000000000005', 'Rahul Sharma', 'No shellfish',
    'Roasted Beet & Goat Cheese Salad', 'Braised Short Rib',
    'Warm Apple Crumble', true, 'rahul.demo@tetherly.app'),
  ('a0000000-0000-0000-0000-000000000005', 'Nisha Pathak', 'Vegetarian, no onion or garlic',
    'Heirloom Tomato & Burrata', 'Paneer Makhani (Vegetarian)',
    'Chocolate Tart', true, 'nisha.demo@tetherly.app')
on conflict (wedding_id, guest_name) do update set
  dietary          = excluded.dietary,
  meal_1           = excluded.meal_1,
  meal_2           = excluded.meal_2,
  meal_3           = excluded.meal_3,
  rehearsal_dinner = excluded.rehearsal_dinner,
  email            = coalesce(excluded.email, public.guest_info.email);


-- ─── Song Requests ───────────────────────────────────────────────────────────
-- Garba-heavy, because Friday night is a Sangeet/Garba.

delete from public.song_requests where wedding_id = 'a0000000-0000-0000-0000-000000000005';

insert into public.song_requests (wedding_id, song, artist, requested_by) values
  ('a0000000-0000-0000-0000-000000000005', 'Dholida',            'Osman Mir, Shreya Ghoshal', 'Nisha'),
  ('a0000000-0000-0000-0000-000000000005', 'Chogada',            'Darshan Raval',             'Megha'),
  ('a0000000-0000-0000-0000-000000000005', 'Nagada Sang Dhol',   'Shreya Ghoshal',            'Karan'),
  ('a0000000-0000-0000-0000-000000000005', 'September',          'Earth, Wind & Fire',        'Grace');


-- ─── Notifications ───────────────────────────────────────────────────────────

delete from public.notifications where wedding_id = 'a0000000-0000-0000-0000-000000000005';

insert into public.notifications (wedding_id, message, sender) values
  ('a0000000-0000-0000-0000-000000000005',
   'Welcome to our wedding app! Tap through each tab for the schedule, the Banner Elk guide, your packing list, and more. Heads up — we are at 5,500 feet, so pack a warm layer for every evening. We cannot wait to celebrate with you on Beech Mountain!',
   'Sachi & Rahul');


-- ─── Wedding Events ──────────────────────────────────────────────────────────
-- Six events across three days:
--   1. Mehendi          — Thu 6 May 2027, Mountain House, 6:00 PM
--   2. Haldi            — Fri 7 May 2027, Mary's Meadow, 10:00 AM
--   3. Sangeet & Garba  — Fri 7 May 2027, Overlook Barn, 6:00 PM
--   4. Wedding Ceremony — Sat 8 May 2027, Mary's Meadow, 12:30 PM
--   5. Cocktail Hour    — Sat 8 May 2027, Cliffside Barn, 5:00 PM
--   6. Reception        — Sat 8 May 2027, Overlook Barn, doors 6:15 PM
--
-- Cocktail hour and the reception are seeded as two rows rather than one
-- because they sit in two different barns — that way each gets its own map
-- pin and its own calendar entry, and the doors-vs-start distinction has
-- somewhere to live.
--
-- All start times are stored as UTC. North Carolina is on EDT (UTC−4) in
-- May, so e.g. 6:00 PM EDT on Thu 6 May 2027 = 2027-05-06T22:00:00Z.
-- end_at is null on every row — Sachi gave start times only. Clients fall
-- back to a 1-hour calendar block until real end times are confirmed.
--
-- Idempotent: re-running this seed upserts each row by (wedding_id, event_id).

insert into public.wedding_events (
  wedding_id, event_id, sort_order, title, emoji, date_label, time_label,
  venue, address, dress_code, description, notes, wedding_party_only,
  start_at, end_at, outdoor_note, extras
) values
  (
    'a0000000-0000-0000-0000-000000000005',
    'mehendi',
    1,
    'Mehendi',
    '🌿',
    'Thursday, 6 May 2027',
    '6:00 PM',
    'Mountain House, Beech Mountain',
    '830 Elderberry Ridge Road, Beech Mountain, NC 28604, USA',
    'Relaxed Indian attire — greens, pastels, and anything comfortable',
    'Our weekend opens with Mehendi at the Mountain House. Henna artists, chai, snacks, and an easy evening together before the big days begin. Come get your hands done and settle in.',
    'Join the henna waitlist from the app when the station opens — you will get a notification when it is your turn, so you can stay by the fire instead of standing in line. Wear short sleeves or push-up sleeves, and skip anything you mind smudging.',
    false,
    '2027-05-06T22:00:00Z',
    null,
    'Evenings at 5,500 feet drop into the 40s in May. Bring a real jacket, not just a shawl.',
    jsonb_build_object(
      'colorPalette', jsonb_build_array(
        jsonb_build_object('name','mehendi green', 'hex','#4F6B3A'),
        jsonb_build_object('name','sage',          'hex','#8FAF88'),
        jsonb_build_object('name','marigold',      'hex','#F0A500'),
        jsonb_build_object('name','coral',         'hex','#E8735A'),
        jsonb_build_object('name','ivory',         'hex','#F5EFE3'),
        jsonb_build_object('name','antique gold',  'hex','#C9A84C')
      )
    )
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'haldi',
    2,
    'Haldi',
    '🌼',
    'Friday, 7 May 2027',
    '10:00 AM',
    'Mary''s Meadow, Overlook Barn',
    '830 Elderberry Ridge Road, Beech Mountain, NC 28604, USA',
    'Yellow or white — and nothing you want to keep',
    'Turmeric, laughter, and a lot of mess. Family and friends bless Sachi and Rahul with haldi in the meadow, with the Blue Ridge behind us. Expect to be covered in it by the end.',
    'Turmeric stains permanently. Wear something you are happy to throw away, and bring a change of clothes plus a towel for the ride back.',
    false,
    '2027-05-07T14:00:00Z',
    null,
    'Mary''s Meadow is open grass at altitude — morning sun is strong and the wind picks up. Sunscreen and a hat, even if it feels cool.',
    jsonb_build_object(
      'colorPalette', jsonb_build_array(
        jsonb_build_object('name','turmeric',   'hex','#E6A817'),
        jsonb_build_object('name','marigold',   'hex','#F0A500'),
        jsonb_build_object('name','sunflower',  'hex','#F7CE46'),
        jsonb_build_object('name','white',      'hex','#FFFFFF'),
        jsonb_build_object('name','ivory',      'hex','#F5EFE3'),
        jsonb_build_object('name','meadow green','hex','#6B7F5E')
      )
    )
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'sangeet',
    3,
    'Sangeet & Garba',
    '💃',
    'Friday, 7 May 2027',
    '6:00 PM',
    'Overlook Barn, Beech Mountain',
    '830 Elderberry Ridge Road, Beech Mountain, NC 28604, USA',
    'Vibrant and festive Indian attire — garba-ready',
    'Performances, a dandiya circle, and dancing under the barn''s thirty-foot beams with the mountains going dark outside. This is the night the weekend really opens up. Bring your best moves.',
    'Dandiya sticks are provided — you do not need to pack your own. Requests for the DJ go in the Songs tab.',
    false,
    '2027-05-07T22:00:00Z',
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
    'a0000000-0000-0000-0000-000000000005',
    'ceremony',
    4,
    'Wedding Ceremony',
    '💍',
    'Saturday, 8 May 2027',
    '12:30 PM',
    'Mary''s Meadow, Overlook Barn',
    '830 Elderberry Ridge Road, Beech Mountain, NC 28604, USA',
    'Indian formal',
    'Sachi and Rahul marry in Mary''s Meadow, under a mandap in the open with the Blue Ridge Mountains all around. Traditional rituals, the people who raised them, and one very good view.',
    'Please be seated by 12:15 PM. The ceremony runs long by design — there is a break before cocktail hour.',
    false,
    '2027-05-08T16:30:00Z',
    null,
    'The ceremony is outdoors on grass. Block heels or wedges rather than stilettos, and bring sunglasses — the meadow is fully exposed at midday.',
    jsonb_build_object(
      'colorPalette', jsonb_build_array(
        jsonb_build_object('name','ruby red',     'hex','#9B1C1C'),
        jsonb_build_object('name','rust',         'hex','#B4532A'),
        jsonb_build_object('name','antique gold', 'hex','#C9A84C'),
        jsonb_build_object('name','ivory',        'hex','#F5EFE3'),
        jsonb_build_object('name','blush',        'hex','#F2C4CE'),
        jsonb_build_object('name','sage',         'hex','#8FAF88'),
        jsonb_build_object('name','moss',         'hex','#6B7F5E'),
        jsonb_build_object('name','deep taupe',   'hex','#6B5A4E')
      )
    )
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'cocktail-hour',
    5,
    'Cocktail Hour',
    '🥂',
    'Saturday, 8 May 2027',
    '5:00 PM',
    'Cliffside Barn, Overlook Barn',
    '830 Elderberry Ridge Road, Beech Mountain, NC 28604, USA',
    'Indian formal or black-tie',
    'Drinks and passed bites in Cliffside Barn, with the glass door rolled up and the covered deck open to the valley. The golden hour up here is the reason people book this place.',
    'Cliffside is a short walk across the property from Overlook Barn — a golf cart shuttle runs for anyone who would rather ride.',
    false,
    '2027-05-08T21:00:00Z',
    null,
    'The deck is open to the wind and cools fast once the sun drops behind the ridge. Keep a wrap or jacket with you.',
    jsonb_build_object(
      'colorPalette', jsonb_build_array(
        jsonb_build_object('name','blush',        'hex','#F2C4CE'),
        jsonb_build_object('name','dusty rose',   'hex','#C8A0A0'),
        jsonb_build_object('name','champagne',    'hex','#EDD9A3'),
        jsonb_build_object('name','sage',         'hex','#8FAF88'),
        jsonb_build_object('name','charcoal',     'hex','#3C4043'),
        jsonb_build_object('name','black',        'hex','#000000'),
        jsonb_build_object('name','antique gold', 'hex','#C9A84C')
      ),
      'blackTieGuide', jsonb_build_object(
        'men',   'Tuxedos (or a black suit), or Indian formal — sherwani or bandhgala',
        'women', 'Floor-length gowns or formal Indian attire such as sarees or lehengas'
      )
    )
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'reception',
    6,
    'Reception',
    '🎉',
    'Saturday, 8 May 2027',
    '6:45 PM (doors 6:15 PM)',
    'Overlook Barn, Beech Mountain',
    '830 Elderberry Ridge Road, Beech Mountain, NC 28604, USA',
    'Indian formal or black-tie',
    'Dinner, speeches, and dancing until they turn the lights on. Find your table, find your people, and stay late — this is the last night of the weekend.',
    'Doors open at 6:15 PM so you can find your seat; the reception itself begins at 6:45 PM with the couple''s entrance. Please be seated by 6:40 PM.',
    false,
    '2027-05-08T22:45:00Z',
    null,
    null,
    jsonb_build_object(
      'colorPalette', jsonb_build_array(
        jsonb_build_object('name','blush',        'hex','#F2C4CE'),
        jsonb_build_object('name','dusty rose',   'hex','#C8A0A0'),
        jsonb_build_object('name','champagne',    'hex','#EDD9A3'),
        jsonb_build_object('name','sage',         'hex','#8FAF88'),
        jsonb_build_object('name','charcoal',     'hex','#3C4043'),
        jsonb_build_object('name','black',        'hex','#000000'),
        jsonb_build_object('name','antique gold', 'hex','#C9A84C')
      ),
      'blackTieGuide', jsonb_build_object(
        'men',   'Tuxedos (or a black suit), or Indian formal — sherwani or bandhgala',
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
-- Banner Elk / Beech Mountain / NC High Country content tailored to Sachi &
-- Rahul's weekend. Stored as a single wedding_guides row (migration 027).
-- currency_code is left null — this is a domestic US wedding and the live-FX
-- widget isn't relevant. photo_strip is empty for now; upload mountain /
-- venue photos to the wedding-guide-images bucket (migration 031) and update
-- the row to show them.
--
-- The sections / quick_facts / filter_pills JSON below is dollar-quoted
-- ($g$ ... $g$) so apostrophes inside descriptions don't need escaping.
--
-- Drive times and distances are approximate and worth re-checking before this
-- goes to real guests — mountain routes vary a lot with weather and season.

insert into public.wedding_guides (
  wedding_id, page_title, page_subtitle_tag, page_subtitle,
  currency_code, filter_pills, sections, quick_facts, photo_strip
) values (
  'a0000000-0000-0000-0000-000000000005',
  'High Country Guide',
  'Banner Elk & Beech Mountain',
  'Everything you need to know about getting up the mountain and making a weekend of it.',
  null,
  $g$["All","Transport","Sightseeing","Activity","Restaurant","Bar","Practical"]$g$::jsonb,
  $g$[
    {
      "id": "getting-there",
      "title": "Getting to Beech Mountain",
      "emoji": "✈️",
      "items": [
        {
          "id": "flights",
          "name": "By Air",
          "category": "Transport",
          "description": "Charlotte Douglas (CLT) is the main option — roughly 115 miles and about 2.5 hours of driving, with the most flights and the best rental car selection. Tri-Cities (TRI) in Tennessee is the closest at around 1 hour 15 minutes. Asheville (AVL) is about 1 hour 45 minutes and worth checking if you want to pair the weekend with a few days there.",
          "tip": "CLT almost always wins on price and schedule. The extra hour of driving buys you a much easier flight search."
        },
        {
          "id": "by-car",
          "name": "By Car",
          "category": "Transport",
          "description": "You want a car for this weekend. From Charlotte take I-85 to US-321 north through Blowing Rock, then NC-105 and NC-184 up to Banner Elk and Beech Mountain. The last stretch up the mountain is steep and full of switchbacks.",
          "tip": "The final climb is not the place to learn your rental. Give yourself daylight for the first trip up, and take the turns slower than the signs suggest."
        },
        {
          "id": "rideshare",
          "name": "Rideshare and Taxis",
          "category": "Transport",
          "description": "Do not plan around Uber or Lyft. Coverage in the High Country is thin and on Beech Mountain it is close to nonexistent, especially late at night. Local car services exist but need booking days ahead.",
          "tip": "Rent a car, or coordinate with other guests on your flight. If you plan to drink at the Sangeet or reception, sort your ride before the day, not after the second drink."
        },
        {
          "id": "on-property",
          "name": "Getting Around the Property",
          "category": "Transport",
          "description": "Mary's Meadow, Cliffside Barn and Overlook Barn all sit on the same property at 830 Elderberry Ridge Road, within a short walk of each other. Parking is on site.",
          "tip": "The walking paths are gravel and grass and they slope. This matters more for your shoe choice than the dress code does."
        }
      ]
    },
    {
      "id": "where-to-stay",
      "title": "Where to Stay",
      "emoji": "🏡",
      "items": [
        {
          "id": "beech-mountain-rentals",
          "name": "On Beech Mountain",
          "category": "Practical",
          "description": "The mountain is mostly cabins and condos rather than hotels. Staying up here puts you five to ten minutes from every event, which is the single best thing you can do for a three-day weekend.",
          "tip": "Groups and families do well splitting a cabin. Book early — early May is graduation season in the region and inventory moves."
        },
        {
          "id": "banner-elk",
          "name": "Banner Elk",
          "category": "Practical",
          "description": "Down the mountain in the valley, about 15 minutes from the venue. More inns, small hotels and restaurants within walking distance of each other.",
          "tip": "A good middle ground if you want somewhere to eat and wander between events."
        },
        {
          "id": "boone-blowing-rock",
          "name": "Boone and Blowing Rock",
          "category": "Practical",
          "description": "About 30 to 40 minutes away, with the widest choice of standard hotel brands. Boone is a college town with plenty to do; Blowing Rock is smaller and prettier.",
          "tip": "Worth it if you want a familiar hotel chain, but you will be driving the mountain road late at night after the reception."
        }
      ]
    },
    {
      "id": "things-to-do",
      "title": "Things to Do",
      "emoji": "🗺️",
      "subsections": [
        {
          "id": "mountains-views",
          "title": "Mountains & Views",
          "emoji": "⛰️",
          "category": "Sightseeing",
          "items": [
            {
              "id": "grandfather-mountain",
              "name": "Grandfather Mountain",
              "category": "Sightseeing",
              "description": "The area's headline attraction — the Mile High Swinging Bridge, a wildlife habitat with bears and otters, and hiking from gentle to genuinely serious. About 20 minutes from Banner Elk.",
              "tip": "Buy timed tickets online in advance; the entrance gate can sell out on clear weekends.",
              "address": "2050 Blowing Rock Hwy, Linville, NC 28646"
            },
            {
              "id": "blue-ridge-parkway",
              "name": "Blue Ridge Parkway",
              "category": "Sightseeing",
              "description": "One of the great American drives, and it runs right past the area. The Linn Cove Viaduct around Grandfather Mountain is the most photographed stretch of the whole parkway.",
              "tip": "Sections close without much notice for weather or repairs — check the Parkway's road status page the morning you go."
            },
            {
              "id": "linville-falls",
              "name": "Linville Falls",
              "category": "Sightseeing",
              "description": "A waterfall on the Parkway with several overlook trails, from a flat 20-minute walk to a steeper scramble down to the base. Around 45 minutes from the venue.",
              "tip": "The Erwins View trail is the easy one and still gets you the postcard shot."
            },
            {
              "id": "beech-summit",
              "name": "Beech Mountain Summit",
              "category": "Sightseeing",
              "description": "At 5,506 feet, Beech Mountain is the highest town in the eastern United States. The resort area at the top has the best views on the mountain and a bar to drink them from.",
              "tip": "The temperature at the summit runs noticeably colder than the valley. Take a jacket even on a warm afternoon."
            }
          ]
        },
        {
          "id": "activities",
          "title": "Activities",
          "emoji": "🥾",
          "category": "Activity",
          "items": [
            {
              "id": "emerald-outback",
              "name": "Emerald Outback Trails",
              "category": "Activity",
              "description": "A trail network on Beech Mountain itself, with hiking and mountain biking routes and overlooks across the ridgeline. Easy to fit into a free morning without driving anywhere.",
              "tip": "Trailheads sit above 5,000 feet — the climbs feel harder than the distance suggests."
            },
            {
              "id": "mast-general",
              "name": "Mast General Store, Valle Crucis",
              "category": "Activity",
              "description": "An original 1880s general store, still trading — creaky floors, a post office, and barrels of old-fashioned candy. About 30 minutes away and a genuinely charming hour.",
              "tip": "The candy barrels are the point. Bring cash and no self-control."
            },
            {
              "id": "banner-elk-winery",
              "name": "Banner Elk Winery",
              "category": "Activity",
              "description": "A small mountain winery and vineyard just outside town, with tastings and a view. An easy low-effort afternoon for guests who are not hiking.",
              "tip": "Check hours before driving out — High Country businesses often run a reduced schedule in early May."
            },
            {
              "id": "land-of-oz",
              "name": "Land of Oz",
              "category": "Activity",
              "description": "A 1970s Wizard of Oz theme park on Beech Mountain, abandoned for decades and now open only on select dates. Wonderfully strange, and the yellow brick road is still there.",
              "tip": "Opening dates are limited and tickets sell out months out. Check the schedule before you get anyone's hopes up."
            }
          ]
        }
      ]
    },
    {
      "id": "eat-drink",
      "title": "Eat & Drink",
      "emoji": "🍽️",
      "subsections": [
        {
          "id": "restaurants",
          "title": "Restaurants",
          "emoji": "🍴",
          "category": "Restaurant",
          "items": [
            {
              "id": "freds",
              "name": "Fred's General Mercantile",
              "category": "Restaurant",
              "description": "The heart of Beech Mountain — a general store with a deli in the back, plus groceries, firewood, and anything you forgot to pack. The closest thing to a village centre up here.",
              "tip": "Best breakfast sandwich on the mountain, and where to grab snacks for the cabin on the way in.",
              "address": "501 Beech Mountain Pkwy, Beech Mountain, NC 28604"
            },
            {
              "id": "louisiana-purchase",
              "name": "Louisiana Purchase Food & Spirits",
              "category": "Restaurant",
              "description": "A Banner Elk institution serving Creole and Cajun food in an old mountain house. The sort of place people have been coming back to for thirty years.",
              "tip": "Reserve ahead for a group — the dining rooms are small."
            },
            {
              "id": "stonewalls",
              "name": "Stonewalls Restaurant",
              "category": "Restaurant",
              "description": "Classic Banner Elk steak-and-seafood dining, reliable and comfortable, and a safe choice for a large mixed group the night before the events start."
            },
            {
              "id": "sorrentos",
              "name": "Sorrento's Italian Bistro",
              "category": "Restaurant",
              "description": "Casual Italian in Banner Elk — pasta and pizza, unfussy, and good for families with kids or anyone who has had enough of a heavy menu."
            },
            {
              "id": "over-yonder",
              "name": "Over Yonder, Valle Crucis",
              "category": "Restaurant",
              "description": "Appalachian cooking in a restored farmhouse about 30 minutes away. Worth the drive if you want one properly memorable meal that is not a wedding event.",
              "tip": "Reserve well ahead. It is small and it books out."
            }
          ]
        },
        {
          "id": "bars",
          "title": "Bars & Breweries",
          "emoji": "🍺",
          "category": "Bar",
          "items": [
            {
              "id": "beech-mountain-brewing",
              "name": "Beech Mountain Brewing Co.",
              "category": "Bar",
              "description": "The resort's own brewery and taproom at the base area — casual, easy, and a short drive from wherever you are staying on the mountain."
            },
            {
              "id": "skybar",
              "name": "5506' Skybar",
              "category": "Bar",
              "description": "A bar at the top of Beech Mountain with the best view in the county. Named for the elevation, which tells you everything about the drive up.",
              "tip": "Seasonal hours — check it is open before you make the trip."
            },
            {
              "id": "lost-province",
              "name": "Lost Province Brewing, Boone",
              "category": "Bar",
              "description": "Brewery and wood-fired kitchen in downtown Boone, about 35 minutes away. A good anchor if guests are making a day of Boone."
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
          "name": "Weather in Early May",
          "category": "Practical",
          "description": "Mild days and cold nights. In the valley, highs run in the mid 60s to low 70s°F with lows around 50°F. On Beech Mountain, at 5,500 feet, subtract roughly 8 to 10°F — afternoons in the high 50s to low 60s and nights that can drop into the 40s. Rain and low cloud are common; a passing shower is normal.",
          "tip": "Every event on this weekend either starts outdoors or ends after dark. Pack a real jacket and something waterproof, not just a shawl."
        },
        {
          "id": "altitude",
          "name": "Altitude",
          "category": "Practical",
          "description": "Beech Mountain is the highest town in the eastern US at 5,506 feet. Most people feel nothing beyond getting winded faster on stairs and hills, but dehydration and alcohol both hit harder than at sea level.",
          "tip": "Drink more water than you think you need, especially on Sangeet night."
        },
        {
          "id": "cell-service",
          "name": "Cell Service & Wi-Fi",
          "category": "Practical",
          "description": "Coverage is patchy on the mountain roads and varies a lot by carrier and by which side of a ridge you are on. Most cabins and venues have Wi-Fi.",
          "tip": "Download your maps for offline use before you drive up. Do not count on a live route once you leave the main road."
        },
        {
          "id": "driving",
          "name": "Mountain Driving",
          "category": "Practical",
          "description": "Steep grades, tight switchbacks, and few streetlights. Fog can settle in within minutes at this elevation, and deer are common at dusk.",
          "tip": "Use a low gear going down rather than riding the brakes, and slow right down in fog. Fill up in Banner Elk — gas on the mountain is limited."
        },
        {
          "id": "timezone",
          "name": "Time Zone",
          "category": "Practical",
          "description": "Eastern Daylight Time (EDT, UTC−4) in May. Same clock as New York."
        },
        {
          "id": "plug",
          "name": "Plug Type",
          "category": "Practical",
          "description": "Type A / Type B sockets, 120V, 60Hz. Guests travelling from India or Europe should check for dual-voltage appliances or pack a converter, not just an adaptor."
        },
        {
          "id": "emergency",
          "name": "Medical & Emergency",
          "category": "Practical",
          "description": "911 for police, fire, or ambulance. The nearest hospitals are Cannon Memorial in Linville, around 20 minutes from the venue, and Watauga Medical Center in Boone, around 40 minutes.",
          "tip": "Pharmacies are in Banner Elk and Boone, not on the mountain. Bring what you need with you."
        },
        {
          "id": "seasonal-hours",
          "name": "Seasonal Hours",
          "category": "Practical",
          "description": "Early May sits between the ski season and the summer season. Some restaurants, shops and attractions run reduced hours or close for a few weeks.",
          "tip": "Call ahead before driving anywhere specific. This is the most common way visitors lose an afternoon up here."
        }
      ]
    }
  ]$g$::jsonb,
  $g$[
    {"key": "Weather (May)", "value": "Cool · 45–65°F on the mountain"},
    {"key": "Elevation",     "value": "5,506 ft"},
    {"key": "Time zone",     "value": "EDT (UTC−4)"},
    {"key": "Currency",      "value": "US Dollar ($)"},
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
-- Blue Ridge spring + Indian multi-day packing content tailored to Sachi &
-- Rahul's weekend. Stored as a single row in public.wedding_packing_lists
-- (migration 028).
--
-- categories JSON items support these client-side visibility flags:
--   * weddingPartyOnly    — only shown to wedding-party guests
--   * excludeWeddingParty — hidden from wedding-party guests
--   * bridalPartyOnly     — only shown to bridesmaids/bridesman
--   * excludeBridalParty  — hidden from bridesmaids/bridesman
--   * gender ('male' | 'female') — only shown to guests of that gender
-- When gender is unknown on the guest row, all items show.

insert into public.wedding_packing_lists (
  wedding_id, page_title, page_subtitle_tag, page_subtitle,
  completion_message, categories, tip_footer
) values (
  'a0000000-0000-0000-0000-000000000005',
  'Packing Guide',
  'What to Bring',
  'Six events, three days, and a mountain that runs ten degrees colder than the forecast.',
  $g$You're all packed! See you on Beech Mountain!$g$,
  $g$[
    {
      "id": "outfits",
      "title": "Outfits",
      "emoji": "👗",
      "items": [
        {
          "id": "mehendi-outfit-female",
          "label": "Mehendi outfit",
          "tip": "Relaxed Indian attire in greens and pastels. Short or push-up sleeves so henna has room to dry, and nothing you mind smudging.",
          "gender": "female"
        },
        {
          "id": "mehendi-outfit-male",
          "label": "Mehendi outfit",
          "tip": "Relaxed Indian attire — a kurta is perfect. Layer something warm over it; the Mountain House gets cold once the sun is down.",
          "gender": "male"
        },
        {
          "id": "haldi-outfit",
          "label": "Haldi outfit — yellow or white, and disposable",
          "tip": "Turmeric does not come out. Wear something you are genuinely happy to throw away afterwards."
        },
        {
          "id": "haldi-change",
          "label": "Change of clothes for after the Haldi",
          "tip": "Plus a towel or old shirt for the car seat on the way back."
        },
        {
          "id": "sangeet-outfit-female",
          "label": "Sangeet & Garba outfit",
          "tip": "Vibrant and festive — chaniya choli, lehenga, or a saree you can actually spin in. There will be dandiya.",
          "gender": "female"
        },
        {
          "id": "sangeet-outfit-male",
          "label": "Sangeet & Garba outfit",
          "tip": "Vibrant and festive Indian attire — kediyu, kurta, or sherwani. Come ready to dance.",
          "gender": "male"
        },
        {
          "id": "ceremony-outfit-female",
          "label": "Wedding ceremony outfit",
          "tip": "Indian formal — saree or lehenga. The ceremony is outdoors at midday in an open meadow, so factor in sun and wind.",
          "gender": "female"
        },
        {
          "id": "ceremony-outfit-male",
          "label": "Wedding ceremony outfit",
          "tip": "Indian formal — sherwani, bandhgala, or kurta with a jacket.",
          "gender": "male"
        },
        {
          "id": "reception-outfit-female",
          "label": "Cocktail & reception outfit",
          "tip": "Indian formal or black-tie — a floor-length gown, saree, or lehenga.",
          "gender": "female"
        },
        {
          "id": "reception-outfit-male",
          "label": "Cocktail & reception outfit",
          "tip": "Black-tie: tuxedo or dark suit. Or Indian formal: sherwani or bandhgala.",
          "gender": "male"
        },
        {
          "id": "casual-layers",
          "label": "Casual outfits for daytime and the drive (2–3)",
          "tip": "Jeans and long sleeves. Early May up here is not shorts weather until the afternoon, if then."
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
          "id": "meadow-shoes-female",
          "label": "Block heels or wedges for the meadow events",
          "tip": "The Haldi and the ceremony are both on open grass. Stilettos sink — block heels, wedges, or dressy flats will save your day.",
          "gender": "female"
        },
        {
          "id": "meadow-shoes-male",
          "label": "Dress shoes you can walk on grass in",
          "tip": "The paths between the barns are gravel and grass, and they slope.",
          "gender": "male"
        },
        {
          "id": "dance-shoes",
          "label": "Comfortable shoes for the Sangeet and reception",
          "tip": "Two long nights of dancing on a barn floor. Choose accordingly."
        },
        {
          "id": "haldi-shoes",
          "label": "Old shoes or sandals for the Haldi",
          "tip": "Same rule as the outfit — turmeric wins every time."
        },
        {
          "id": "walking-shoes",
          "label": "Trainers or hiking shoes",
          "tip": "For Grandfather Mountain, the Emerald Outback trails, or just crossing a wet car park at altitude."
        }
      ]
    },
    {
      "id": "mountain-essentials",
      "title": "Mountain Essentials",
      "emoji": "⛰️",
      "items": [
        {
          "id": "warm-jacket",
          "label": "A proper warm jacket",
          "tip": "The single most forgotten item for a mountain wedding. Evenings at 5,500 feet drop into the 40s in May — a shawl is not enough."
        },
        {
          "id": "rain-layer",
          "label": "Rain jacket or compact umbrella",
          "tip": "Showers and low cloud roll through fast up here, often without much warning in the forecast."
        },
        {
          "id": "wrap-pashmina",
          "label": "Wrap, pashmina, or shawl for the evening events",
          "tip": "Something that works over formal wear — Cliffside Barn's deck is open to the wind.",
          "gender": "female"
        },
        {
          "id": "sunscreen",
          "label": "Sunscreen",
          "tip": "UV is stronger at elevation than it feels. The Haldi and the ceremony are both outdoors with no shade."
        },
        {
          "id": "sunglasses",
          "label": "Sunglasses"
        },
        {
          "id": "hair-clip-female",
          "label": "Hair clips, ties, and strong hairspray",
          "tip": "Mary's Meadow is exposed and breezy — useful for both outdoor events and every photo taken at them.",
          "gender": "female"
        },
        {
          "id": "water-bottle",
          "label": "Reusable water bottle",
          "tip": "Altitude dehydrates you faster, and so does a Garba night."
        },
        {
          "id": "offline-maps",
          "label": "Downloaded offline maps",
          "tip": "Cell service is patchy on the mountain roads. Save the route before you drive up."
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
          "label": "Jewellery for each event",
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
          "id": "stole",
          "label": "Dupatta or stole for the ceremony",
          "gender": "male"
        },
        {
          "id": "steamer",
          "label": "Travel steamer or wrinkle spray",
          "tip": "Five outfits in three days, all of them folded in a suitcase. Cabins rarely have an iron."
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
          "id": "moisturiser",
          "label": "Moisturiser and lip balm",
          "tip": "Mountain air in spring is dry and windy — your skin will notice by day two."
        },
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
          "tip": "TSA requires a REAL ID-compliant licence for US domestic flights. A passport works too."
        },
        {
          "id": "us-plug-adaptor",
          "label": "US plug adaptor (international guests only)",
          "tip": "US outlets are Type A / Type B, 120V. Bring a converter too if your electronics are not dual-voltage."
        },
        { "id": "phone-charger", "label": "Phone charger" },
        {
          "id": "car-charger",
          "label": "Car charger or battery pack",
          "tip": "You will be driving more than you expect, and navigation eats a battery."
        },
        { "id": "meds", "label": "Personal medications" },
        {
          "id": "motion-sickness",
          "label": "Motion sickness tablets",
          "tip": "The road up the mountain is all switchbacks. Worth having if anyone in the car is prone to it."
        }
      ]
    }
  ]$g$::jsonb,
  $g${
    "title": "Tip: Dress for the valley, pack for the summit",
    "text": "Beech Mountain sits at 5,506 feet and runs eight to ten degrees colder than the forecast you will see for Banner Elk. Every event this weekend is either outdoors or ends after dark, so bring a real jacket and something waterproof — and remember the Haldi clothes are going in the bin afterwards."
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
-- Sets the EDT timezone footer under the schedule timeline. venue_photo_url
-- and venue_map_image_urls are left null / empty — until you upload photos,
-- the timeline just shows the events and the timezone footer.
--
-- A property map would earn its keep for this wedding: guests move between
-- Mary's Meadow, Cliffside Barn and Overlook Barn on Saturday alone.
--
-- To add a venue photo later:
--   1. Upload to the wedding-venue-images bucket (migration 030) at
--      a0000000-0000-0000-0000-000000000005/venue.jpg
--   2. update public.wedding_schedule_pages
--        set venue_photo_url = 'https://.../wedding-venue-images/.../venue.jpg'
--        where wedding_id = 'a0000000-0000-0000-0000-000000000005';
--
-- To add one or more map images (guests swipe between them):
--   update public.wedding_schedule_pages
--     set venue_map_image_urls = array[
--       'https://.../map-page-1.png',
--       'https://.../map-page-2.png'
--     ]
--     where wedding_id = 'a0000000-0000-0000-0000-000000000005';

insert into public.wedding_schedule_pages (
  wedding_id, venue_photo_url, venue_map_image_urls, venue_map_title,
  venue_map_legend, timezone_note
) values (
  'a0000000-0000-0000-0000-000000000005',
  null,
  '{}'::text[],
  null,
  '[]'::jsonb,
  'All times are Eastern Daylight Time (EDT / UTC−4)'
) on conflict (wedding_id) do update set
  -- venue_photo_url and venue_map_* intentionally NOT overwritten on
  -- conflict — once you set them via the dashboard, re-running the seed
  -- shouldn't clobber those. Only the timezone note stays in sync.
  timezone_note = excluded.timezone_note,
  updated_at    = now();
