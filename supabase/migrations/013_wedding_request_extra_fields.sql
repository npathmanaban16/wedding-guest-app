-- ============================================================
-- Migration 013: Add optional guest_count to wedding_requests
-- ============================================================
-- Couples can now optionally share an estimated guest count on the
-- onboarding form. Nullable so existing rows are unaffected.
--
-- Safe to re-run (idempotent).
-- ============================================================

begin;

alter table public.wedding_requests
  add column if not exists guest_count integer;

commit;
