-- ============================================================
-- Migration 003: Wedding-request intake (SaaS variant)
-- ============================================================
-- Adds a public intake table couples fill out from the in-app
-- "Set up your wedding" signup flow (app/couple-signup.tsx).
--
-- Anyone can INSERT (anon key). Reads are restricted to the service
-- role so request details aren't exposed via the public API.
--
-- Safe to run against either Supabase project. Non-destructive and
-- idempotent (`if not exists` throughout).
-- ============================================================

begin;

create table if not exists public.wedding_requests (
  id                  uuid primary key default gen_random_uuid(),
  couple_name         text not null,
  wedding_date_start  date not null,
  -- Optional: couples can mark their wedding as a multi-day celebration.
  wedding_date_end    date,
  email               text not null,
  city                text,
  notes               text,
  status              text not null default 'pending',
  created_at          timestamptz not null default now()
);

alter table public.wedding_requests enable row level security;

-- Public signup: anyone can submit a request.
drop policy if exists wedding_requests_insert_anon on public.wedding_requests;
create policy wedding_requests_insert_anon
  on public.wedding_requests
  for insert
  to anon, authenticated
  with check (true);

-- No select/update/delete policies → only the service role can read or
-- manage rows (via the dashboard, the edge function, or admin scripts).

commit;
