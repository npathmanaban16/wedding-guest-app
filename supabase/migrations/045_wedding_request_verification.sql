-- ============================================================
-- Migration 045: Email verification for wedding_requests
-- ============================================================
-- Adds a token + verified_at pair so the intake flow can double
-- opt-in: the requesting couple gets a "confirm your email" link,
-- and the admin notification only fires once the link is clicked.
-- This kills spam submissions with fake/typo'd addresses.
--
--   * verification_token — auto-generated on insert via the column
--     default; existing rows stay NULL and are ignored by the
--     verification flow (they predate this feature).
--   * verified_at — set by the verify-wedding-request edge function
--     when the couple clicks the confirmation link. NULL means
--     unverified (admin notification not yet sent).
--
-- A partial unique index enforces token uniqueness for populated
-- rows only, leaving the historical NULLs alone.
--
-- Safe to re-run (idempotent).
-- ============================================================

begin;

alter table public.wedding_requests
  add column if not exists verification_token uuid default gen_random_uuid(),
  add column if not exists verified_at timestamptz;

create unique index if not exists wedding_requests_verification_token_idx
  on public.wedding_requests (verification_token)
  where verification_token is not null;

commit;
