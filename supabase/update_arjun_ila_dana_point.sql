-- ============================================================
-- Tetherly — Arjun & Ila: rename destination from Laguna Niguel
--                         to Dana Point (in-place, no reseed)
-- ============================================================
-- Applies just the destination-city + Travel Guide copy changes
-- from seed_arjun_ila_wedding.sql to the live row, so you don't
-- have to re-run the whole seed (which would wipe song requests
-- and notifications for this wedding).
--
-- Safe to run: touches only the Arjun & Ila tenant
-- (a0000000-0000-0000-0000-000000000003) and only the specific
-- fields called out below. Idempotent.
--
-- Leaves alone (intentional):
--   * weddings.location — "The Ritz-Carlton, Laguna Niguel" is
--     the hotel's official brand name.
--   * wedding_events venue/address strings — proper venue names
--     at the Ritz, plus the full USPS address strings that Maps
--     opens with.
--   * Any references to Laguna Beach or Laguna Hills in the
--     Travel Guide — those are distinct nearby cities.
-- ============================================================

-- 1. destination_city (drives the map-icon tab label + "… Guide"
--    tile on Home + "arrival in …" labels on My Details).
update public.weddings
   set destination_city = 'Dana Point'
 where id = 'a0000000-0000-0000-0000-000000000003';

-- 2. Travel Guide: rename the page, rewrite the intro, and rename
--    the "Getting to …" section + the toll-road driving note.
update public.wedding_guides
   set page_title    = 'Dana Point Guide',
       page_subtitle = 'Everything you need to know about Dana Point and making the most of your trip.',
       sections      = replace(
                         replace(
                           sections::text,
                           '"Getting to Laguna Niguel"',
                           '"Getting to Dana Point"'
                         ),
                         'running north from Laguna Niguel',
                         'running north from Dana Point'
                       )::jsonb,
       updated_at    = now()
 where wedding_id = 'a0000000-0000-0000-0000-000000000003';

-- 3. Packing tip footer: "September in Laguna Niguel …" → Dana Point.
update public.wedding_packing_lists
   set tip_footer = jsonb_set(
                      tip_footer,
                      '{text}',
                      to_jsonb(
                        replace(
                          tip_footer->>'text',
                          'September in Laguna Niguel',
                          'September in Dana Point'
                        )
                      )
                    ),
       updated_at = now()
 where wedding_id = 'a0000000-0000-0000-0000-000000000003';
