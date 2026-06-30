-- ============================================================
-- Migration 026: wedding_events
-- ============================================================
-- DB-backed source of truth for per-wedding event schedules.
--
-- Up until now, schedules lived as code constants (EVENTS_NN,
-- EVENTS_DEMO in constants/weddingData.ts), with admins able to edit
-- individual fields per event via event_time_overrides (migrations
-- 011 + 024). That works for the two original tenants but doesn't
-- scale: a new tenant whose schedule is a different SET of events
-- (different titles, different number of events, different ids) has
-- nowhere to live without a code deploy.
--
-- This table is that home. Rows are scoped by wedding_id and ordered
-- by sort_order. When a wedding has rows here, the app uses them as
-- the schedule source of truth; tenants with NO rows fall back to
-- the legacy code constants + override flow.
--
-- Shape mirrors the WeddingEvent TS interface, with two pragmatic
-- choices:
--   * end_at is nullable — some events (e.g. a Baraat) don't have a
--     posted end time; clients fall back to start_at + 1h for the
--     "Add to Calendar" duration.
--   * extras jsonb holds the optional rich fields (colorPalette,
--     indianAttire, blackTieGuide). They're either present per
--     event or not, and a child table for each would be overkill.
--
-- Composite PK (wedding_id, event_id) lets clients keep treating
-- event_id as a stable string identifier per wedding, matching the
-- existing event_time_overrides shape.
--
-- Idempotent: safe to re-run.
-- ============================================================

create table if not exists public.wedding_events (
  wedding_id          uuid        not null references public.weddings(id) on delete cascade,
  event_id            text        not null,
  sort_order          integer     not null default 0,
  title               text        not null,
  emoji               text,
  date_label          text        not null,
  time_label          text        not null,
  venue               text        not null,
  address             text        not null,
  dress_code          text,
  description         text        not null,
  notes               text,
  wedding_party_only  boolean     not null default false,
  start_at            timestamptz not null,
  end_at              timestamptz,
  outdoor_note        text,
  extras              jsonb,
  updated_at          timestamptz not null default now(),
  primary key (wedding_id, event_id)
);

create index if not exists wedding_events_wedding_id_sort_idx
  on public.wedding_events (wedding_id, sort_order);

alter table public.wedding_events enable row level security;

drop policy if exists "allow_all_wedding_events" on public.wedding_events;
create policy "allow_all_wedding_events"
  on public.wedding_events for all using (true) with check (true);
