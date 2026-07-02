-- ============================================================
-- Migration 039: weddings.chat_enabled
-- ============================================================
-- Per-wedding feature flag for the guest Chat tab on the Messages
-- screen (companion to 038's attendees_enabled). When false the Chat
-- tab is hidden for everyone and the Messages screen shows only
-- Announcements (+ Attendees, if that flag is on).
--
-- Existing chat messages are kept when the flag is off — turning chat
-- back on restores the full history.
--
-- Toggled by admins from the App Features screen. Defaults to true;
-- clients read a missing column as enabled. Apply together with 038 —
-- the client's legacy-select fallback drops BOTH flags when either
-- column is missing.
--
-- Idempotent: safe to re-run.
-- ============================================================

alter table public.weddings
  add column if not exists chat_enabled boolean not null default true;
