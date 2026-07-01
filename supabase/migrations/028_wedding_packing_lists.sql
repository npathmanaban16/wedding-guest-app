-- ============================================================
-- Migration 028: wedding_packing_lists
-- ============================================================
-- Per-wedding packing list. One row per wedding holds the entire
-- packing tree (categories → items with per-guest visibility flags),
-- the page copy, an optional completion message, and an optional
-- tip footer.
--
-- Stored as JSONB rather than a forest of relational tables because
-- the packing list is consumed as a single document per wedding, no
-- cross-wedding queries are needed, and the existing PackingCategory
-- / PackingItem TS types are already a nested tree that maps 1:1.
--
-- Tenants with no row here fall back to the hardcoded
-- PACKING_GUIDE_NN / PACKING_GUIDE_DEMO constants — same fallback
-- pattern as wedding_events (026) and wedding_guides (027).
--
-- categories jsonb shape: PackingCategory[] with items including
-- weddingPartyOnly / bridalPartyOnly / excludeBridalParty /
-- excludeWeddingParty / gender flags — visibility filtering runs
-- client-side against the guest's row in public.guests.
--
-- tip_footer jsonb shape: { title: text, text: text } or null.
--
-- Idempotent: safe to re-run.
-- ============================================================

create table if not exists public.wedding_packing_lists (
  wedding_id           uuid        primary key references public.weddings(id) on delete cascade,
  page_title           text        not null default 'Packing Guide',
  -- Small uppercase tag above the subtitle (e.g. "What to Bring").
  page_subtitle_tag    text,
  -- Descriptive sentence under the title.
  page_subtitle        text,
  -- Shown when the guest checks off every visible item (e.g.
  -- "You're all packed! See you in Laguna Niguel!").
  completion_message   text,
  categories           jsonb       not null default '[]'::jsonb,
  tip_footer           jsonb,
  updated_at           timestamptz not null default now()
);

alter table public.wedding_packing_lists enable row level security;

drop policy if exists "allow_all_wedding_packing_lists" on public.wedding_packing_lists;
create policy "allow_all_wedding_packing_lists"
  on public.wedding_packing_lists for all using (true) with check (true);
