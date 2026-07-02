-- ============================================================
-- Migration 035: guests.is_couple
-- ============================================================
-- Marks the two rows on public.guests that represent the couple
-- getting married (as opposed to attending guests). Used by the
-- Attendees directory on the Messages tab to hide the couple from
-- the "who's here" list.
--
-- The couple is already often (though not always) also members of
-- public.wedding_admins, so this flag exists to give the app a
-- reliable, admin-independent signal.
--
-- Defaults to false so existing rows are unaffected. Seeds mark
-- the couple's rows explicitly.
--
-- Idempotent: safe to re-run.
-- ============================================================

alter table public.guests
  add column if not exists is_couple boolean not null default false;
