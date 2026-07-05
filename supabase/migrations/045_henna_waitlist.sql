-- ============================================================
-- Migration 045: henna waitlist
-- ============================================================
-- Adds a live sign-up + queue system for a wedding's henna
-- station(s). Three additions:
--
--   1. wedding_admins.role gains 'henna_artist' — a new vendor
--      role (login-only, no admin powers) that mirrors 'dj' and
--      'makeup_artist'. Any admin with this role sees the
--      artist-facing queue screen and can pull from the queue.
--
--   2. henna_stations — one row per wedding. Any henna_artist
--      can toggle is_open, which controls whether guests can
--      join the line. display_name is an optional label shown
--      on the guest side ("Henna with Priya"). Simple singleton
--      config (PK = wedding_id).
--
--   3. henna_waitlist — one row per queued sign-up. Status
--      moves 'waiting' → 'in_progress' → 'done' | 'skipped';
--      guests can 'cancelled' their own row before it's pulled.
--      Multiple artists can serve in parallel — each in_progress
--      row is tagged with served_by so the artist's screen can
--      show only their own chair.
--
-- Idempotent: safe to re-run.

-- ─── Schema changes ──────────────────────────────────────────────

alter table public.wedding_admins
  drop constraint if exists wedding_admins_role_check;

alter table public.wedding_admins
  add constraint wedding_admins_role_check
  check (role in ('planner', 'dj', 'makeup_artist', 'henna_artist'));


create table if not exists public.henna_stations (
  wedding_id   uuid primary key references public.weddings(id) on delete cascade,
  is_open      boolean not null default false,
  -- Optional label the guest tab shows on the "join line" card, e.g.
  -- "Henna with Priya". NULL falls back to a generic "Henna waitlist".
  display_name text,
  updated_at   timestamptz not null default now()
);


create table if not exists public.henna_waitlist (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  -- Who's getting henna. Free text so a guest can add a family member
  -- who isn't a named entry on the guest list (kids, a plus-one who
  -- hasn't logged in). The 3-per-guest cap is enforced by added_by
  -- rather than this field.
  guest_name  text not null,
  -- Login name of whoever tapped "Join line" / "Add someone else".
  -- Used to enforce the 3-active-spots-per-guest cap and to route
  -- push notifications (we ping the added_by device so a parent
  -- signing up their kid still gets pinged when it's the kid's turn).
  added_by    text not null,
  status      text not null default 'waiting'
              check (status in ('waiting', 'in_progress', 'done', 'skipped', 'cancelled')),
  -- Henna artist (wedding_admins.guest_name) who pulled this entry
  -- from the queue. Set on Start, kept for history so an artist's
  -- screen can filter to their own past chair.
  served_by   text,
  joined_at   timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);

-- Queue-ordering index — the guest and artist screens both scan
-- (wedding_id, status='waiting') sorted by joined_at.
create index if not exists henna_waitlist_wedding_status_joined_idx
  on public.henna_waitlist (wedding_id, status, joined_at);

-- Per-artist chair lookup — the artist screen reads
-- (wedding_id, served_by, status='in_progress') to find their
-- current chair. Cheap since served_by is only set on active rows.
create index if not exists henna_waitlist_wedding_served_idx
  on public.henna_waitlist (wedding_id, served_by)
  where status = 'in_progress';


-- ─── Row-level security ─────────────────────────────────────────
-- Follows the same allow-all-with-check pattern the rest of this
-- schema uses — auth lives in the app layer, not the DB.

alter table public.henna_stations enable row level security;
alter table public.henna_waitlist enable row level security;

drop policy if exists "allow_all_henna_stations" on public.henna_stations;
create policy "allow_all_henna_stations"
  on public.henna_stations for all using (true) with check (true);

drop policy if exists "allow_all_henna_waitlist" on public.henna_waitlist;
create policy "allow_all_henna_waitlist"
  on public.henna_waitlist for all using (true) with check (true);


-- ─── Per-wedding seed data ──────────────────────────────────────
-- Adds a demo henna artist login + a closed henna station to any
-- tenant we already know about (N&N and the Arjun & Ila pitch
-- demo). role='henna_artist' excludes the artist from admin powers
-- in WeddingContext but routes them to the artist queue screen
-- on login. is_open starts false so guests don't see the join
-- card on the home tab until the artist explicitly opens the line.

do $$
declare
  nn_id uuid;
  ai_id uuid;
begin
  -- N&N
  select id into nn_id from public.weddings where invite_code = 'NEHANAVEEN2026';
  if nn_id is not null then
    insert into public.wedding_admins (wedding_id, guest_name, is_wedding_party, gender, role)
    values (nn_id, 'Priya Kapoor', true, 'female', 'henna_artist')
    on conflict (wedding_id, guest_name) do update set
      is_wedding_party = excluded.is_wedding_party,
      gender           = excluded.gender,
      role             = excluded.role;

    insert into public.henna_stations (wedding_id, is_open, display_name)
    values (nn_id, false, 'Henna with Priya')
    on conflict (wedding_id) do nothing;
  else
    raise notice 'Wedding NEHANAVEEN2026 not present in this env; skipping.';
  end if;

  -- Arjun & Ila (pitch demo). Uses a different first name from
  -- the existing "Priya Sharma" guest on this tenant to keep the
  -- artist unambiguous at login.
  select id into ai_id from public.weddings where invite_code = 'ARJUNILA2026';
  if ai_id is not null then
    insert into public.wedding_admins (wedding_id, guest_name, is_wedding_party, gender, role)
    values (ai_id, 'Anjali Mehta', true, 'female', 'henna_artist')
    on conflict (wedding_id, guest_name) do update set
      is_wedding_party = excluded.is_wedding_party,
      gender           = excluded.gender,
      role             = excluded.role;

    insert into public.henna_stations (wedding_id, is_open, display_name)
    values (ai_id, false, 'Henna with Anjali')
    on conflict (wedding_id) do nothing;
  else
    raise notice 'Wedding ARJUNILA2026 not present in this env; skipping.';
  end if;
end $$;
