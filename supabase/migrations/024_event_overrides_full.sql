-- Migration 024: extend event_time_overrides to cover all editable text fields
--
-- Adds nullable columns for the other event fields admins can now edit from
-- the in-app admin screen: title, the display date string, venue, address,
-- dress code, description, notes, and the wedding-party-only visibility
-- flag. NULL means "no override — fall back to the value defined in code".
--
-- The `time` column also becomes nullable: a row may now exist purely to
-- override (say) just the title without setting a time.
--
-- Table name stays event_time_overrides for backwards compat — the
-- columns documented in code (services/storage.ts) refer to it generically.
--
-- Idempotent: safe to re-run.

alter table public.event_time_overrides
  add column if not exists title              text,
  add column if not exists event_date         text,
  add column if not exists venue              text,
  add column if not exists address            text,
  add column if not exists dress_code         text,
  add column if not exists description        text,
  add column if not exists notes              text,
  add column if not exists wedding_party_only boolean;

alter table public.event_time_overrides
  alter column time drop not null;
