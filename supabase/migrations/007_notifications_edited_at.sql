-- ============================================================
-- Migration 007: Notifications edited_at
-- ============================================================
-- Admins can edit messages they have already sent (fix a typo, add
-- detail, etc.). Track when the message was last edited so the guest
-- feed can indicate that a message was changed after being posted.

alter table public.notifications
  add column if not exists edited_at timestamptz;
