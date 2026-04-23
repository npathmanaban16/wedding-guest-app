-- ============================================================
-- Migration 008: wedding_admins — role + is_wedding_party + gender
-- ============================================================
-- Non-guest admins (wedding planner, DJ, …) sometimes need the same
-- visibility as a wedding-party guest (e.g. the rehearsal dinner) or
-- should only see one side of gender-gated packing lists. Storing those
-- flags on wedding_admins keeps the intent explicit — they're neither
-- guests nor invitees, so copying them into public.guests would pollute
-- the guest list (counts, RSVPs, etc.).
--
-- `role` additionally lets us tailor what each vendor sees and whether
-- they get admin powers. Admins with no role (or role='planner') keep
-- the full admin ui (send notifications, delete messages, admin page).
-- Vendor roles like 'dj' are login-only — see WeddingContext.isAdmin.

alter table public.wedding_admins
  add column if not exists is_wedding_party boolean not null default false,
  add column if not exists gender text check (gender in ('male', 'female')),
  add column if not exists role   text check (role   in ('planner', 'dj'));

-- Resolve the N&N wedding id via invite code so this migration works
-- regardless of which environment it's run against — seed.sql hardcoded
-- 00000000-…-1, seed_saas.sql uses a0000000-…-1. Silently no-ops if the
-- wedding doesn't exist in this env (e.g. SaaS test projects).
do $$
declare
  nn_id uuid;
begin
  select id into nn_id
  from public.weddings
  where invite_code = 'NEHANAVEEN2026';

  if nn_id is null then
    raise notice 'Wedding NEHANAVEEN2026 not present in this env; skipping N&N-specific seed.';
    return;
  end if;

  -- Neha + Naveen are in public.guests so the guests row wins for
  -- wedding-party / gender lookups. Setting the admin row to match is
  -- just data hygiene.
  update public.wedding_admins
  set is_wedding_party = true, gender = 'female'
  where wedding_id = nn_id and guest_name = 'Neha Pathmanaban';

  update public.wedding_admins
  set is_wedding_party = true, gender = 'male'
  where wedding_id = nn_id and guest_name = 'Naveen Nath';

  -- Wedding planner: sees the rehearsal dinner + women-only packing.
  update public.wedding_admins
  set is_wedding_party = true, gender = 'female', role = 'planner'
  where wedding_id = nn_id
    and guest_name = 'Astrid Rolando';

  -- DJ. Logs in as "DJ Shraii". Not in the wedding party (so the
  -- rehearsal dinner is auto-hidden by the existing schedule filter).
  -- role='dj' excludes him from admin powers in WeddingContext.
  insert into public.wedding_admins (wedding_id, guest_name, is_wedding_party, gender, role)
  values (nn_id, 'DJ Shraii', false, 'male', 'dj')
  on conflict (wedding_id, guest_name) do update set
    is_wedding_party = excluded.is_wedding_party,
    gender           = excluded.gender,
    role             = excluded.role;
end $$;
