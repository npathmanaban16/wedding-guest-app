-- ============================================================
-- Migration 017: Wedding shared-photo-album URL (per-wedding)
-- ============================================================
-- Adds a `photo_album_url` column to public.weddings so the
-- Photos tab and the AI assistant can both reach the right
-- per-tenant Google Photos (or other) shared album. Previously
-- this URL lived in build-variant constants alongside the
-- (now-fixed) planner name, so any tenant accessed via the
-- SaaS/Tetherly build was offered the demo album URL.
--
-- Backfills:
--   • Neha & Naveen wedding (both schemas) → real album URL
--   • Tetherly demo wedding                  → placeholder
--
-- Nullable so future tenants can be created without an album
-- and fill it in later. Safe to re-run.
-- ============================================================

alter table public.weddings
  add column if not exists photo_album_url text;

update public.weddings
   set photo_album_url = 'https://photos.app.goo.gl/YCMxM6i7XRNzKERd6'
 where id in (
   '00000000-0000-0000-0000-000000000001',  -- N&N original schema
   'a0000000-0000-0000-0000-000000000001'   -- N&N SaaS schema
 ) and (photo_album_url is null or photo_album_url = '');

update public.weddings
   set photo_album_url = 'https://example.com/photos'
 where id = 'a0000000-0000-0000-0000-000000000002'  -- Tetherly demo
   and (photo_album_url is null or photo_album_url = '');
