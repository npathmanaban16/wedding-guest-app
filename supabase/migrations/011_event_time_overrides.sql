-- ============================================================
-- Migration 011: event_time_overrides
-- ============================================================
-- Lets admins (Neha, Naveen, Astrid — anyone with a non-vendor role)
-- override the `time` string on individual schedule events without a
-- code deploy. Events themselves stay defined in code; this table only
-- stores the overridden `time` field per (wedding_id, event_id).
--
-- The schedule screen merges overrides at render time: override wins
-- if present, otherwise fall back to the hardcoded event.time. Other
-- fields (date, venue, dress code…) remain code-only.
--
-- Idempotent: safe to re-run.

create table if not exists public.event_time_overrides (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  event_id    text not null,
  time        text not null,
  updated_at  timestamptz not null default now(),
  unique (wedding_id, event_id)
);

alter table public.event_time_overrides enable row level security;

drop policy if exists "allow_all_event_time_overrides" on public.event_time_overrides;
create policy "allow_all_event_time_overrides"
  on public.event_time_overrides for all using (true) with check (true);
