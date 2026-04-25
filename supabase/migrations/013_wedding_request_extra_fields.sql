-- ============================================================
-- Migration 013: Add optional guest_count + venue to wedding_requests
-- ============================================================
-- Couples can now optionally share an estimated guest count and a
-- venue / hotel string on the onboarding form. Both nullable so
-- existing rows are unaffected.
--
-- Safe to re-run (idempotent).
-- ============================================================

begin;

alter table public.wedding_requests
  add column if not exists guest_count integer,
  add column if not exists venue text;

commit;
