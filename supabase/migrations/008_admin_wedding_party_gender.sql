-- ============================================================
-- Migration 008: wedding_admins — is_wedding_party + gender
-- ============================================================
-- Non-guest admins (wedding planner, DJ, …) sometimes need the same
-- visibility as a wedding-party guest (e.g. the rehearsal dinner) or
-- should only see one side of gender-gated packing lists. Storing those
-- flags on wedding_admins keeps the intent explicit — they're neither
-- guests nor invitees, so copying them into public.guests would pollute
-- the guest list (counts, RSVPs, etc.).
--
-- After this runs, WeddingContext.isWeddingParty / getGuestGender fall
-- through to the admins row when the name isn't in public.guests.

alter table public.wedding_admins
  add column if not exists is_wedding_party boolean not null default false,
  add column if not exists gender text check (gender in ('male', 'female'));

-- N&N wedding planner: sees the rehearsal dinner + women-only packing.
update public.wedding_admins
set is_wedding_party = true, gender = 'female'
where wedding_id = '00000000-0000-0000-0000-000000000001'
  and guest_name = 'Astrid Rolando';

-- N&N DJ: login access only. No wedding-party or gender gating beyond
-- the default (sees everything that isn't gated).
insert into public.wedding_admins (wedding_id, guest_name, is_wedding_party, gender)
values ('00000000-0000-0000-0000-000000000001', 'Shraii Mashru', false, null)
on conflict (wedding_id, guest_name) do nothing;
