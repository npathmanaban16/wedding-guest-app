-- ─────────────────────────────────────────────────────────────────────────────
-- N&N → SaaS user-data migration
-- ─────────────────────────────────────────────────────────────────────────────
--
-- The SaaS seed (seed_saas.sql) mirrors N&N's pre-collected data: wedding row,
-- guests, admins, dietary/meals/rehearsal on guest_info, phone/email, song
-- requests. It does NOT carry over data that guests have entered in-app:
--
--   • guest_info: hotel, check_in, check_out, arrival_time, flight_number,
--     extra_notes
--   • packing_checklist: checked_items
--
-- That data lives only in the live N&N Supabase (suranxrcuqguwzwfowye) and
-- needs to be copied over to the SaaS project (anezjniflzoxfzxyctja) under
-- the SaaS tenant wedding_id.
--
-- How to run (two steps):
--
--   1. Paste this file into the N&N Supabase project's SQL Editor and run it.
--      The sole SELECT below emits one row per UPSERT statement — each row's
--      `sql` column is a standalone SQL statement scoped to the SaaS
--      wedding_id (a0000000-0000-0000-0000-000000000001).
--
--   2. Copy every value from the `sql` column (click the column header to
--      select all, copy, paste into a text editor to concatenate), then paste
--      the concatenated script into the SaaS Supabase project's SQL Editor
--      and run it.
--
-- Re-running is safe: all statements are upserts keyed by
-- (wedding_id, guest_name), so re-running against the SaaS DB is idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

with
  nn_wedding_id as (
    select '00000000-0000-0000-0000-000000000001'::uuid as id
  ),
  saas_wedding_id as (
    select 'a0000000-0000-0000-0000-000000000001'::uuid as id
  ),
  guest_info_rows as (
    -- UPSERT, not UPDATE: if the SaaS seed somehow lacks this guest's row,
    -- still insert their travel info. On conflict we only touch travel
    -- fields, leaving dietary / meals / rehearsal / phone / email intact.
    select
      format(
        $fmt$insert into public.guest_info (wedding_id, guest_name, hotel, check_in, check_out, arrival_time, flight_number, extra_notes, updated_at) values (%L, %L, %L, %L, %L, %L, %L, %L, now()) on conflict (wedding_id, guest_name) do update set hotel=excluded.hotel, check_in=excluded.check_in, check_out=excluded.check_out, arrival_time=excluded.arrival_time, flight_number=excluded.flight_number, extra_notes=excluded.extra_notes, updated_at=now();$fmt$,
        (select id from saas_wedding_id),
        gi.guest_name,
        coalesce(gi.hotel, ''),
        coalesce(gi.check_in, ''),
        coalesce(gi.check_out, ''),
        coalesce(gi.arrival_time, ''),
        coalesce(gi.flight_number, ''),
        coalesce(gi.extra_notes, '')
      ) as sql,
      1 as ordinal,
      gi.guest_name as guest_name
    from public.guest_info gi
    where gi.wedding_id = (select id from nn_wedding_id)
      and (
        coalesce(gi.hotel, '')         <> '' or
        coalesce(gi.check_in, '')      <> '' or
        coalesce(gi.check_out, '')     <> '' or
        coalesce(gi.arrival_time, '')  <> '' or
        coalesce(gi.flight_number, '') <> '' or
        coalesce(gi.extra_notes, '')   <> ''
      )
  ),
  packing_rows as (
    select
      format(
        $fmt$insert into public.packing_checklist (wedding_id, guest_name, checked_items, updated_at) values (%L, %L, %L::text[], now()) on conflict (wedding_id, guest_name) do update set checked_items=excluded.checked_items, updated_at=excluded.updated_at;$fmt$,
        (select id from saas_wedding_id),
        pc.guest_name,
        pc.checked_items::text
      ) as sql,
      2 as ordinal,
      pc.guest_name as guest_name
    from public.packing_checklist pc
    where pc.wedding_id = (select id from nn_wedding_id)
      and array_length(pc.checked_items, 1) is not null
  )
select sql
from (
  select sql, ordinal, guest_name from guest_info_rows
  union all
  select sql, ordinal, guest_name from packing_rows
) all_rows
order by ordinal, guest_name;
