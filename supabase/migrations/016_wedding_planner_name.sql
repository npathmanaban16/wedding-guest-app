-- ============================================================
-- Migration 016: Wedding planner name (per-wedding)
-- ============================================================
-- Adds a `planner_name` column to public.weddings so the planner is
-- stored per-tenant instead of being hardcoded as a build-variant
-- constant. Previously the app shipped two build configs, each baking
-- in a single planner name (Astrid for the N&N build, Sophie for the
-- SaaS demo build) — which produced confidently-wrong answers from
-- the in-app AI assistant whenever the N&N tenant was reached via
-- the SaaS/Tetherly build.
--
-- Backfills:
--   • Neha & Naveen wedding (both schemas) → 'Astrid'
--   • Tetherly demo wedding                  → 'Sophie'
--
-- Nullable so future weddings can be created without a planner and
-- filled in later. Safe to re-run.
-- ============================================================

alter table public.weddings
  add column if not exists planner_name text;

update public.weddings
   set planner_name = 'Astrid'
 where id in (
   '00000000-0000-0000-0000-000000000001',  -- N&N in original schema
   'a0000000-0000-0000-0000-000000000001'   -- N&N in SaaS schema
 ) and (planner_name is null or planner_name = '');

update public.weddings
   set planner_name = 'Sophie'
 where id = 'a0000000-0000-0000-0000-000000000002'  -- Tetherly demo
   and (planner_name is null or planner_name = '');
