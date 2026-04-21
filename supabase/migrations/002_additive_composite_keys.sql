-- ============================================================
-- Migration 002: Additive composite unique keys
-- ============================================================
-- Adds (wedding_id, ...) unique indexes to tables that currently only
-- have single-column uniqueness. Existing single-column constraints are
-- left in place so older clients keep working.
--
-- Why: storage.ts upserts will switch to composite onConflict targets
-- like 'wedding_id,guest_name'. Supabase requires a matching unique
-- index for onConflict to resolve; these indexes provide it.
--
-- Safe to run against the live N&N Supabase. Non-destructive:
--   • No drops, no rewrites, no data changes.
--   • `if not exists` on every index so re-runs no-op.
--
-- Run this AFTER 001_multi_tenant.sql.
-- ============================================================

begin;

-- guest_info: currently has `guest_name text unique`. Add composite.
create unique index if not exists guest_info_wedding_id_guest_name_key
  on public.guest_info (wedding_id, guest_name);

-- packing_checklist: currently has `guest_name text primary key`. Add
-- composite unique so onConflict='wedding_id,guest_name' resolves.
create unique index if not exists packing_checklist_wedding_id_guest_name_key
  on public.packing_checklist (wedding_id, guest_name);

-- notification_reactions: currently has unique (notification_id, guest_name).
-- Add (wedding_id, notification_id, guest_name) to match the SaaS schema
-- and support the composite onConflict target.
create unique index if not exists notification_reactions_wedding_id_notification_id_guest_name_key
  on public.notification_reactions (wedding_id, notification_id, guest_name);

commit;
