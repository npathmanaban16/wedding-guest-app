-- ============================================================
-- Migration 034: Guest profile-images storage bucket
-- ============================================================
-- Home for per-guest profile photos referenced by
-- guests.profile_photo_url (migration 033).
--
-- Kept separate from wedding-hero-images / wedding-venue-images /
-- wedding-guide-images so replace/delete flows can safely wipe
-- everything under `<wedding_id>/<guest>/` (or `<wedding_id>/`) in
-- one bucket without touching wedding-level assets — matches the
-- per-purpose bucket convention.
--
-- Path convention: `<wedding_id>/<guest_id_or_name>-<timestamp>.<ext>`
-- so the file browser stays auditable per tenant.
--
-- Public-read so any signed-in guest can see other guests' photos
-- without a signed-URL round-trip; permissive write/delete for now
-- until real auth lands.
--
-- Idempotent: safe to re-run.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('guest-profile-images', 'guest-profile-images', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'guest_profile_images_public_read'
  ) then
    create policy "guest_profile_images_public_read"
      on storage.objects for select
      using (bucket_id = 'guest-profile-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'guest_profile_images_public_write'
  ) then
    create policy "guest_profile_images_public_write"
      on storage.objects for insert
      with check (bucket_id = 'guest-profile-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'guest_profile_images_public_delete'
  ) then
    create policy "guest_profile_images_public_delete"
      on storage.objects for delete
      using (bucket_id = 'guest-profile-images');
  end if;
end $$;
