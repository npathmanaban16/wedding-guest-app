-- ============================================================
-- Migration 027: wedding_guides
-- ============================================================
-- Per-wedding destination guide. One row per wedding holds the
-- entire guide tree (sections → subsections → items), the page
-- copy, the filter pill labels, the "Quick Facts" card content,
-- and an optional horizontal photo strip.
--
-- Stored as JSONB rather than a forest of relational tables
-- because:
--   * the guide is consumed as a single document per wedding;
--   * no cross-wedding analytic queries are needed; and
--   * the existing TypeScript types (GuideSection / GuideSubsection
--     / GuideItem in constants/weddingData.ts) are already a nested
--     tree, and JSONB matches them 1:1 without any flattening.
--
-- Tenants with no row here fall back to the hardcoded
-- SWITZERLAND_GUIDE constant for N&N and Emma & James, same pattern
-- as the wedding_events fallback added in migration 026.
--
-- JSONB shapes:
--   sections     — array of GuideSection ({ id, title, emoji, items?, subsections? })
--   quick_facts  — array of { key: text, value: text }
--   photo_strip  — array of { url: text, label: text }
--   filter_pills — array of text labels in display order; first
--                  pill is the "show everything" reset
--
-- Idempotent: safe to re-run.
-- ============================================================

create table if not exists public.wedding_guides (
  wedding_id           uuid        primary key references public.weddings(id) on delete cascade,
  page_title           text        not null,
  -- Small uppercase tag rendered above the page subtitle copy. Optional.
  page_subtitle_tag    text,
  -- Longer descriptive sentence under the title. Optional.
  page_subtitle        text,
  -- ISO 4217 currency code (e.g. 'CHF', 'USD'). Drives the live FX-rate
  -- fetch on the "currency" guide item. Null skips the fetch (domestic
  -- weddings where most guests already use the local currency).
  currency_code        text,
  filter_pills         jsonb       not null default '["All"]'::jsonb,
  sections             jsonb       not null default '[]'::jsonb,
  quick_facts          jsonb       not null default '[]'::jsonb,
  photo_strip          jsonb       not null default '[]'::jsonb,
  updated_at           timestamptz not null default now()
);

alter table public.wedding_guides enable row level security;

drop policy if exists "allow_all_wedding_guides" on public.wedding_guides;
create policy "allow_all_wedding_guides"
  on public.wedding_guides for all using (true) with check (true);
