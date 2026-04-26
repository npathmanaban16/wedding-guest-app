-- ============================================================
-- Migration 019: Custom packing items per guest
-- ============================================================
-- Lets each guest add their own personal items to the packing tab
-- (sunscreen brand they prefer, contact lens solution, etc.) on top
-- of the wedding's built-in packing list. Custom items stay private
-- to the guest who added them and live alongside `checked_items` in
-- the same packing_checklist row, so a single read still returns
-- everything the packing screen needs.
--
-- Schema choice: jsonb array of {id, label} rather than a separate
-- packing_custom_items table. The data is small per guest, only ever
-- read/written together with checked_items, and never queried
-- across guests.
--
-- Safe to re-run; the column add and the default value are both
-- idempotent.
-- ============================================================

alter table public.packing_checklist
  add column if not exists custom_items jsonb not null default '[]'::jsonb;
