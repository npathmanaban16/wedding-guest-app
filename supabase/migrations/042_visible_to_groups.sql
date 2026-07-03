-- ============================================================
-- Migration 042: visible_to_groups on events + packing items
-- ============================================================
-- Wire the guest_groups added in migration 041 into the two per-
-- wedding visibility surfaces guests actually see:
--
--   * public.wedding_events — schedule tab + home-tab "up next" card
--   * public.wedding_packing_lists.categories JSONB — packing tab
--
-- Design decisions (locked in with product):
--   * Include-only filter. If visible_to_groups is set on an item or
--     event, the guest must be in one of those groups to see it. No
--     hidden_from_groups counterpart; exclude-style behavior stays on
--     the existing legacy flags (excludeBridalParty, excludeWeddingParty).
--   * Legacy flags remain as an additive AND. If both a group filter
--     and a legacy flag apply, the item is only visible when BOTH
--     pass. That keeps every existing item working the moment this
--     migration lands — nothing is silently loosened.
--   * Empty/null visible_to_groups = "no group gating from this
--     dimension". New weddings default to unrestricted so the "everyone
--     sees everything" model works out of the box; admins narrow later.
--
-- No packing-list schema change: the categories column is JSONB, so
-- items pick up an optional string[] `visible_to_groups` field just by
-- writing it. The client filter treats missing/empty the same as "no
-- gating". Documented here so the shape is discoverable from the
-- migration history rather than only from the seed files.
--
-- Idempotent: safe to re-run.
-- ============================================================

alter table public.wedding_events
  add column if not exists visible_to_groups uuid[] not null default '{}';

comment on column public.wedding_events.visible_to_groups is
  'When non-empty, only guests who belong to at least one of these '
  'guest_groups.id values see the event. Empty (the default) means no '
  'group gating; wedding_party_only still applies as a legacy AND filter.';

-- No FK-array-cascade in Postgres, so a group delete leaves stale UUIDs
-- behind. The admin UI is expected to prune references when a group is
-- deleted; the client filter treats a stale UUID as "no one is in this
-- group" (i.e. the item won't render for anyone if all its groups are
-- stale — safer than silently loosening).

-- ─── Packing list item shape (JSONB) ────────────────────────────────────────
-- Each item inside wedding_packing_lists.categories[*].items[] MAY now carry:
--   "visible_to_groups": ["<guest_groups.id uuid>", ...]
-- Interpretation matches wedding_events.visible_to_groups above: empty or
-- absent = no group gating, otherwise the guest must be a member of at
-- least one referenced group. All existing legacy filter fields
-- (weddingPartyOnly, bridalPartyOnly, excludeBridalParty,
-- excludeWeddingParty, gender) continue to apply as additive AND filters.
