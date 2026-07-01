-- ============================================================
-- Migration 030: Wedding venue-images storage bucket
-- ============================================================
-- Home for per-wedding venue photos and hotel/venue floor plans —
-- the images referenced by public.wedding_schedule_pages
-- (venue_photo_url + venue_map_image_url, added in migration 029).
--
-- Kept separate from wedding-hero-images (migration 025) so that
-- the eventual self-serve admin UI has a 1:1 mapping between
-- upload widget and bucket, and replace/delete flows can safely
-- wipe everything under `<wedding_id>/` without accidentally
-- touching the couple's home-screen hero image.
--
-- Bucket layout mirrors wedding-hero-images: public-read for
-- straight-from-URL rendering; permissive write/delete for now,
-- matching the rest of the schema until real auth lands.
--
-- Path convention: `<wedding_id>/<filename>` — same as
-- uploadMessageImage / the hero-images bucket.
--
-- Idempotent: safe to re-run.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('wedding-venue-images', 'wedding-venue-images', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'wedding_venue_images_public_read'
  ) then
    create policy "wedding_venue_images_public_read"
      on storage.objects for select
      using (bucket_id = 'wedding-venue-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'wedding_venue_images_public_write'
  ) then
    create policy "wedding_venue_images_public_write"
      on storage.objects for insert
      with check (bucket_id = 'wedding-venue-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'wedding_venue_images_public_delete'
  ) then
    create policy "wedding_venue_images_public_delete"
      on storage.objects for delete
      using (bucket_id = 'wedding-venue-images');
  end if;
end $$;
