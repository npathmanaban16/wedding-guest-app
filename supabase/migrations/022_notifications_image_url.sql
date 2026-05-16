-- ============================================================
-- Migration 022: Notification image attachments
-- ============================================================
-- Lets admins attach a photo when sending a message in the feed.
-- Two pieces:
--   1. `image_url` column on `notifications` — public URL of the
--      uploaded photo, or NULL for a text-only message.
--   2. `message-images` Supabase Storage bucket — public-read so
--      guests can render the photo straight from the URL without
--      needing a signed-URL round-trip on each message load.
--
-- The `message` column stays NOT NULL so existing inserts keep
-- working; for an image-only send the admin client passes an empty
-- string. The client treats empty message + image_url as "photo
-- only" and renders accordingly.
--
-- Idempotent: safe to re-run.
-- ============================================================

alter table public.notifications
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('message-images', 'message-images', true)
on conflict (id) do nothing;

-- Permissive storage policies, matching the rest of the schema.
-- Auth + admin gating happens in the application layer for now; when
-- real auth lands these tighten to "wedding admin only" inserts.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'message_images_public_read'
  ) then
    create policy "message_images_public_read"
      on storage.objects for select
      using (bucket_id = 'message-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'message_images_public_write'
  ) then
    create policy "message_images_public_write"
      on storage.objects for insert
      with check (bucket_id = 'message-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'message_images_public_delete'
  ) then
    create policy "message_images_public_delete"
      on storage.objects for delete
      using (bucket_id = 'message-images');
  end if;
end $$;
