-- ============================================================
-- Migration 033: guests.profile_photo_url + guests.bio
-- ============================================================
-- Two optional profile fields for the Attendees directory:
--   * profile_photo_url — URL of a photo uploaded to the
--     guest-profile-images bucket (migration 034). Null falls back
--     to the guest's initials in the UI.
--   * bio — short free-text field for "how I know the couple", e.g.
--     "Bride's college roommate" or "Groom's cousin from Chicago".
--
-- Both are nullable so existing guests aren't disrupted. The
-- Attendees directory renders every guest in public.guests,
-- populated or not — a guest without a photo/bio just shows their
-- name + initials avatar.
--
-- Idempotent: safe to re-run.
-- ============================================================

alter table public.guests
  add column if not exists profile_photo_url text,
  add column if not exists bio               text;
