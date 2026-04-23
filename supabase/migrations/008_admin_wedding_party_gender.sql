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
-- `role` additionally lets us tailor what each vendor sees — e.g. the DJ
-- only needs the events he's actually DJing, not the rehearsal dinner
-- or ceremony. The schedule screen reads the role and filters events
-- accordingly; see app/(tabs)/schedule.tsx.

alter table public.wedding_admins
  add column if not exists is_wedding_party boolean not null default false,
  add column if not exists gender text check (gender in ('male', 'female')),
  add column if not exists role   text check (role   in ('planner', 'dj'));

-- N&N wedding planner: sees the rehearsal dinner + women-only packing.
update public.wedding_admins
set is_wedding_party = true, gender = 'female', role = 'planner'
where wedding_id = '00000000-0000-0000-0000-000000000001'
  and guest_name = 'Astrid Rolando';

-- N&N DJ. Logs in as "DJ Shraii". Not in the wedding party; scoped to
-- the Sangeet + Reception on the schedule (enforced in the client).
insert into public.wedding_admins (wedding_id, guest_name, is_wedding_party, gender, role)
values ('00000000-0000-0000-0000-000000000001', 'DJ Shraii', false, null, 'dj')
on conflict (wedding_id, guest_name) do update set
  is_wedding_party = excluded.is_wedding_party,
  gender           = excluded.gender,
  role             = excluded.role;
