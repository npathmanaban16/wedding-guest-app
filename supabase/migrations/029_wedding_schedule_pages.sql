-- ============================================================
-- Migration 029: wedding_schedule_pages
-- ============================================================
-- Per-wedding overrides for the bottom of the Schedule tab: the
-- venue photo, the hotel/venue map card, and the timezone footer
-- note. One row per wedding, all fields nullable — null hides its
-- corresponding UI element.
--
-- Legacy tenants (N&N + Emma & James at the Fairmont Le Montreux
-- Palace) don't need rows here; the code fallback renders their
-- bundled floor plan + fairmont.png photo + CEST timezone footer.
-- New tenants live in this table: any field they leave null hides
-- that piece of UI on the Schedule tab.
--
-- venue_map_legend jsonb shape: array of
--   { n: int, event: text, room: text, when: text, color: text }
-- items — matches the VENUES arrays previously hardcoded in
-- components/FairmontMap.tsx.
--
-- Idempotent: safe to re-run.
-- ============================================================

create table if not exists public.wedding_schedule_pages (
  wedding_id           uuid        primary key references public.weddings(id) on delete cascade,
  -- Photo shown below the venue map. Null hides the image.
  venue_photo_url      text,
  -- Hotel/venue floor plan image. Null hides the map image (but the
  -- card + legend still render if venue_map_legend is non-empty).
  venue_map_image_url  text,
  -- Header title on the map card. Defaults to "Hotel Map" client-side
  -- when null.
  venue_map_title      text,
  -- Numbered legend rows. Empty array + null map image hides the whole
  -- map card.
  venue_map_legend     jsonb       not null default '[]'::jsonb,
  -- Footer note about times. Null hides the timezone footer.
  timezone_note        text,
  updated_at           timestamptz not null default now()
);

alter table public.wedding_schedule_pages enable row level security;

drop policy if exists "allow_all_wedding_schedule_pages" on public.wedding_schedule_pages;
create policy "allow_all_wedding_schedule_pages"
  on public.wedding_schedule_pages for all using (true) with check (true);
