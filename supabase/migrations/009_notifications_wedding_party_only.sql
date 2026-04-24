-- ============================================================
-- Migration 009: notifications.wedding_party_only
-- ============================================================
-- Some admin messages are wedding-party-specific — e.g. "buses leave for
-- the rehearsal dinner at 6 PM." Add a per-notification opt-in flag so
-- those messages only reach the wedding party (in the feed and via push).
--
-- When `wedding_party_only = true`:
--   • The client feed hides the notification from non-wedding-party users
--     (see app/(tabs)/messages.tsx and (tabs)/_layout.tsx unread count).
--   • The send-push edge function only pushes to guests with
--     public.guests.is_wedding_party = true.
--
-- Default is false so existing messages and default sends keep their
-- "everyone" audience.

alter table public.notifications
  add column if not exists wedding_party_only boolean not null default false;
