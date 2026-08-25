-- ============================================================
-- Migration 046: Waitlist signups (SaaS variant)
-- ============================================================
-- Landing-page /join-waitlist form. The primary path is a low-friction
-- signup: role + email only. The optional "Tell us more about your
-- wedding" section fills in the same fields the in-app couple-signup
-- flow collects, but all of those are nullable here since a Planner,
-- Vendor, or "just curious" visitor won't have wedding details.
--
-- Rows submitted with a full couple_name + wedding_date_start are also
-- mirrored into wedding_requests by the client so the existing in-app
-- triage flow keeps working; that's a client-side concern, not this
-- migration's.
--
-- Anyone can INSERT (anon key). Reads are restricted to the service
-- role so signup details aren't exposed via the public API.
--
-- Safe to run against either Supabase project. Non-destructive and
-- idempotent (`if not exists` throughout).
-- ============================================================

begin;

create table if not exists public.waitlist_signups (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null,
  -- 'couple' | 'planner' | 'vendor' | 'curious'. Kept as free text so
  -- new roles can be added without a migration; the front-end enforces
  -- the closed set.
  role                text not null,
  couple_name         text,
  wedding_date_start  date,
  wedding_date_end    date,
  guest_count         integer,
  city                text,
  notes               text,
  status              text not null default 'pending',
  created_at          timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;

-- Public signup: anyone can submit.
drop policy if exists waitlist_signups_insert_anon on public.waitlist_signups;
create policy waitlist_signups_insert_anon
  on public.waitlist_signups
  for insert
  to anon, authenticated
  with check (true);

-- No select/update/delete policies → only the service role can read or
-- manage rows (via the dashboard, admin scripts, or the edge function).

commit;
