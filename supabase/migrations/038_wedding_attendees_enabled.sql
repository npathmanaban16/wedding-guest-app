-- ============================================================
-- Migration 038: weddings.attendees_enabled
-- ============================================================
-- Per-wedding feature flag for the Attendees directory and guest
-- profiles. When false:
--   • The Messages screen hides the Attendees tab.
--   • My Details hides the profile (photo + bio) editor, since those
--     fields are only surfaced in the Attendees directory.
--
-- Toggled by admins from the new App Features screen (app/admin-
-- settings.tsx). Defaults to true so existing weddings keep their
-- current behavior; clients read a missing column as enabled, so an
-- un-migrated database also behaves as before.
--
-- Idempotent: safe to re-run.
-- ============================================================

alter table public.weddings
  add column if not exists attendees_enabled boolean not null default true;
