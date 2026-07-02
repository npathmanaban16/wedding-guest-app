-- ============================================================
-- Migration 040: weddings.onboarding_enabled
-- ============================================================
-- Per-wedding feature flag for the guest onboarding form (the
-- accommodation/arrival-details flow guests are redirected into on
-- first login until they've filled hotel + check-in/out). When false,
-- guests land straight on the Home tab and are never redirected;
-- My Details keeps working so travel info can still be entered there.
--
-- Toggled by admins from the App Features screen. Defaults to true;
-- clients read a missing column as enabled. Apply together with
-- 038/039 — the client's legacy-select fallback drops ALL feature
-- flags when any of the columns is missing.
--
-- Idempotent: safe to re-run.
-- ============================================================

alter table public.weddings
  add column if not exists onboarding_enabled boolean not null default true;
