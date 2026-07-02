-- ============================================================
-- Migration 037: notifications.kind — guest chat
-- ============================================================
-- Adds a `kind` discriminator to public.notifications so the Messages
-- screen can host two streams:
--   • 'announcement' — the existing couple/planner messages (default,
--     still sent only by admins via the send-push edge function)
--   • 'chat'         — guest-authored messages posted from the new
--     Chat tab, visible to every guest
--
-- Chat rows reuse the notifications table (rather than a new table) so
-- notification_reactions and notification_replies work on chat messages
-- with zero schema changes — their FKs already point at notifications.id
-- — and the unread tab badge keeps counting both streams.
--
-- Older clients that predate this migration `select *` and will render
-- chat rows in their announcements feed; harmless degradation that goes
-- away once the client updates.
--
-- Idempotent: safe to re-run.
-- ============================================================

alter table public.notifications
  add column if not exists kind text not null default 'announcement';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'notifications_kind_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_kind_check
      check (kind in ('announcement', 'chat'));
  end if;
end $$;
