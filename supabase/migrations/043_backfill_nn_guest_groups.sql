-- ============================================================
-- Migration 043: N&N guest-groups backfill
-- ============================================================
-- Creates the two groups actually used to gate content in the N&N app
-- (Wedding Party, Bridal Party), populates their memberships from the
-- existing is_wedding_party / is_bridal_party flags, and rewires the
-- N&N wedding_events + wedding_packing_lists to reference the groups
-- via visible_to_groups (added in migration 042).
--
-- Rewire rules:
--   * wedding_events.wedding_party_only = true  →  visible_to_groups
--     = [wedding_party_id], legacy flag reset to false. Two events:
--     ceremony-rehearsal, rehearsal-dinner.
--   * packing item with "weddingPartyOnly": true  →  visible_to_groups
--     = [wedding_party_id], legacy flag stripped.
--   * packing item with "bridalPartyOnly":  true  →  visible_to_groups
--     = [bridal_party_id],  legacy flag stripped.
--   * excludeBridalParty / excludeWeddingParty / gender flags are LEFT
--     UNTOUCHED — those are exclude/attribute filters and stay on the
--     legacy path (product chose include-only for the group filter
--     shape, with legacy flags kept as fallback).
--
-- Wedding lookup uses the same pattern as migration 020 (find by
-- Neha's guest row) so this runs correctly against both the original
-- single-tenant schema (00000000-...-000001) and the SaaS schema
-- (a0000000-...-000001) without hardcoding either. If Neha isn't in
-- the guests table (fresh non-N&N DB), the migration no-ops cleanly.
--
-- Idempotent: safe to re-run. Group inserts ON CONFLICT DO NOTHING on
-- (wedding_id, name); member inserts on the primary key; event +
-- packing rewrites are recomputed each run from the current groups
-- table, so a partial failure and retry is fine.
-- ============================================================

begin;

-- ─── Create the two groups ────────────────────────────────────────────
-- Cross-joined against the wedding-id-lookup CTE so no wedding-id is
-- hardcoded. Empty result set (no Neha) → INSERT touches zero rows.

with wed as (
  select wedding_id from public.guests
   where canonical_name = 'Neha Pathmanaban'
   limit 1
)
insert into public.guest_groups (wedding_id, name, description, icon, sort_order)
select
  wed.wedding_id,
  v.name,
  v.description,
  v.icon,
  v.sort_order
  from wed
  cross join (values
    ('Wedding Party',
     'The couple, immediate family, and the wedding party.',
     'heart',  0),
    ('Bridal Party',
     'Bridesmaids and bridesman — the wedding-morning getting-ready crew.',
     'flower', 1)
  ) as v(name, description, icon, sort_order)
on conflict (wedding_id, name) do nothing;


-- ─── Populate memberships ─────────────────────────────────────────────
-- Wedding Party = every guest with is_wedding_party = true.
-- Bridal  Party = every guest with is_bridal_party  = true.
-- The composite FK back to (wedding_id, canonical_name) is enforced by
-- the table definition — we're pulling directly from guests so no
-- orphans possible.

insert into public.guest_group_members (group_id, wedding_id, guest_canonical_name)
select gg.id, g.wedding_id, g.canonical_name
  from public.guests g
  join public.guest_groups gg
    on gg.wedding_id = g.wedding_id
   and gg.name = 'Wedding Party'
 where g.is_wedding_party
   and g.wedding_id = (
     select wedding_id from public.guests
      where canonical_name = 'Neha Pathmanaban' limit 1
   )
on conflict do nothing;

insert into public.guest_group_members (group_id, wedding_id, guest_canonical_name)
select gg.id, g.wedding_id, g.canonical_name
  from public.guests g
  join public.guest_groups gg
    on gg.wedding_id = g.wedding_id
   and gg.name = 'Bridal Party'
 where g.is_bridal_party
   and g.wedding_id = (
     select wedding_id from public.guests
      where canonical_name = 'Neha Pathmanaban' limit 1
   )
on conflict do nothing;


-- ─── Rewire wedding_events ────────────────────────────────────────────
-- Point every wedding-party-only event at the Wedding Party group and
-- clear the legacy flag. This narrows visibility through the new group
-- path — the legacy filter would still gate correctly if left set (the
-- client applies both as AND), but stripping it keeps the source of
-- truth in one place going forward.

update public.wedding_events e
   set visible_to_groups = array[gg.id],
       wedding_party_only = false,
       updated_at = now()
  from public.guest_groups gg
 where gg.wedding_id = e.wedding_id
   and gg.name = 'Wedding Party'
   and e.wedding_id = (
     select wedding_id from public.guests
      where canonical_name = 'Neha Pathmanaban' limit 1
   )
   and e.wedding_party_only = true;


-- ─── Rewire wedding_packing_lists (JSONB) ─────────────────────────────
-- Walk the categories array; for each item, if weddingPartyOnly is true
-- swap it for visible_to_groups=[wedding_party_id]; same for
-- bridalPartyOnly → [bridal_party_id]. All other legacy flags
-- (excludeBridalParty, excludeWeddingParty, gender) are left in place.
-- If neither flag is set, the item is untouched.
--
-- Done in a DO block so we can hold the resolved wedding_id + group
-- UUIDs in local variables and reference them per-item.

do $$
declare
  v_wedding_id       uuid;
  v_wedding_party_id uuid;
  v_bridal_party_id  uuid;
  v_categories       jsonb;
  v_new_categories   jsonb;
  v_cat              jsonb;
  v_new_items        jsonb;
  v_item             jsonb;
  v_new_item         jsonb;
begin
  select wedding_id
    into v_wedding_id
    from public.guests
   where canonical_name = 'Neha Pathmanaban'
   limit 1;

  if v_wedding_id is null then
    raise notice '[043] N&N wedding not found; skipping packing-list rewrite.';
    return;
  end if;

  select id into v_wedding_party_id from public.guest_groups
   where wedding_id = v_wedding_id and name = 'Wedding Party';
  select id into v_bridal_party_id  from public.guest_groups
   where wedding_id = v_wedding_id and name = 'Bridal Party';

  select categories into v_categories from public.wedding_packing_lists
   where wedding_id = v_wedding_id;

  -- No packing-list row (tenant on the code-defined fallback) → nothing
  -- to rewrite. Groups + members + events are enough on their own.
  if v_categories is null then
    return;
  end if;

  v_new_categories := '[]'::jsonb;

  for v_cat in select * from jsonb_array_elements(v_categories) loop
    v_new_items := '[]'::jsonb;

    for v_item in select * from jsonb_array_elements(v_cat -> 'items') loop
      v_new_item := v_item;

      if (v_item ->> 'weddingPartyOnly')::boolean is true then
        v_new_item := (v_new_item - 'weddingPartyOnly')
                   || jsonb_build_object('visible_to_groups',
                        jsonb_build_array(v_wedding_party_id::text));
      elsif (v_item ->> 'bridalPartyOnly')::boolean is true then
        v_new_item := (v_new_item - 'bridalPartyOnly')
                   || jsonb_build_object('visible_to_groups',
                        jsonb_build_array(v_bridal_party_id::text));
      end if;

      v_new_items := v_new_items || jsonb_build_array(v_new_item);
    end loop;

    v_new_categories := v_new_categories
                     || jsonb_build_array(jsonb_set(v_cat, '{items}', v_new_items));
  end loop;

  update public.wedding_packing_lists
     set categories = v_new_categories,
         updated_at = now()
   where wedding_id = v_wedding_id;
end $$;

commit;
