-- ============================================================
-- Migration 044: weddings.ai_enabled
-- ============================================================
-- Per-wedding feature flag for the "Ask" AI assistant floating
-- button (companion to 038–040's other App Features toggles). When
-- false the FAB is hidden across every tab and guests can neither
-- open the chat nor read their past Q&A history.
--
-- Existing ai_questions rows are kept when the flag is off — turning
-- the assistant back on restores the full history view.
--
-- Toggled by admins from the App Features screen. Defaults to true;
-- clients read a missing column as enabled. Apply together with
-- 038–040 — the client's legacy-select fallback drops ALL feature
-- flags when any of the columns is missing.
--
-- Idempotent: safe to re-run.
-- ============================================================

alter table public.weddings
  add column if not exists ai_enabled boolean not null default true;
