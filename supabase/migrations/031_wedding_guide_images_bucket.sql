-- ============================================================
-- Migration 031: Wedding guide-images storage bucket
-- ============================================================
-- Home for per-wedding destination guide photos — the images
-- referenced by the photo_strip jsonb column on
-- public.wedding_guides (added in migration 027).
--
-- Kept separate from wedding-hero-images (025) and
-- wedding-venue-images (030) so the eventual self-serve admin UI
-- has one bucket per upload widget, and per-category replace /
-- delete flows stay clean.
--
-- Bucket layout mirrors the others: public-read for straight-from-
-- URL rendering; permissive write/delete for now until real auth
-- lands.
--
-- Path convention: `<wedding_id>/<filename>` (e.g. `<wedding_id>/
-- promenade.jpg`) — same as the other wedding-scoped buckets.
--
-- Idempotent: safe to re-run.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('wedding-guide-images', 'wedding-guide-images', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'wedding_guide_images_public_read'
  ) then
    create policy "wedding_guide_images_public_read"
      on storage.objects for select
      using (bucket_id = 'wedding-guide-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'wedding_guide_images_public_write'
  ) then
    create policy "wedding_guide_images_public_write"
      on storage.objects for insert
      with check (bucket_id = 'wedding-guide-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'wedding_guide_images_public_delete'
  ) then
    create policy "wedding_guide_images_public_delete"
      on storage.objects for delete
      using (bucket_id = 'wedding-guide-images');
  end if;
end $$;
