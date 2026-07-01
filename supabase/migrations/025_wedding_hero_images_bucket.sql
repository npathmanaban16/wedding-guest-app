-- ============================================================
-- Migration 025: Wedding hero-images storage bucket
-- ============================================================
-- Per-wedding hero photos for the home-screen header. The
-- `weddings.hero_image_url` column already exists (since
-- 001_multi_tenant.sql); this migration adds the Storage bucket
-- those URLs point at, so the manual upload-via-dashboard flow has
-- a place to live.
--
-- Bucket layout mirrors `message-images` (migration 022):
--   - public-read so the home screen can render directly from the
--     URL without a signed-URL round-trip,
--   - permissive write/delete policies for now, matching the rest
--     of the schema; tightens to "wedding admin only" when real
--     auth lands.
--
-- Path convention (matches uploadMessageImage in services/storage.ts):
--   <wedding_id>/<filename>
-- so the public URL looks like
--   https://<project>.supabase.co/storage/v1/object/public/wedding-hero-images/<wedding_id>/<filename>
-- which goes into weddings.hero_image_url verbatim.
--
-- Idempotent: safe to re-run.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('wedding-hero-images', 'wedding-hero-images', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'wedding_hero_images_public_read'
  ) then
    create policy "wedding_hero_images_public_read"
      on storage.objects for select
      using (bucket_id = 'wedding-hero-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'wedding_hero_images_public_write'
  ) then
    create policy "wedding_hero_images_public_write"
      on storage.objects for insert
      with check (bucket_id = 'wedding-hero-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'wedding_hero_images_public_delete'
  ) then
    create policy "wedding_hero_images_public_delete"
      on storage.objects for delete
      using (bucket_id = 'wedding-hero-images');
  end if;
end $$;
