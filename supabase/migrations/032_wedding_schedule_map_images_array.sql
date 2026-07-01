-- ============================================================
-- Migration 032: wedding_schedule_pages.venue_map_image_urls
-- ============================================================
-- Turns the single venue_map_image_url column (added in migration
-- 029) into a text[] array so weddings can display multiple map
-- pages that guests swipe between — e.g. Ritz-Carlton main floor
-- plus grounds/ballroom detail, or two different venue diagrams.
--
-- Order matters: array element 0 is the first page shown, element
-- 1 is the next swipe right, etc.
--
-- Idempotent: safe to re-run. Backfills any legacy single-URL
-- values from the old column into the new array before dropping.
-- ============================================================

alter table public.wedding_schedule_pages
  add column if not exists venue_map_image_urls text[] not null default '{}';

-- Backfill: preserve any URL that was in the old single-value column.
-- Only runs when the old column still exists AND the new array is empty,
-- so re-running this migration after the old column is dropped is a no-op.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wedding_schedule_pages'
      and column_name = 'venue_map_image_url'
  ) then
    execute $sql$
      update public.wedding_schedule_pages
         set venue_map_image_urls = array[venue_map_image_url]
       where venue_map_image_url is not null
         and cardinality(venue_map_image_urls) = 0
    $sql$;
  end if;
end $$;

alter table public.wedding_schedule_pages
  drop column if exists venue_map_image_url;
