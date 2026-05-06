-- ============================================================
-- Migration 021: Add Aya Nath to the bridal party
-- ============================================================
-- Aya Nath was originally seeded as wedding party but not bridal
-- party (see migration 010). She's now a bridesmaid, so flip her
-- is_bridal_party flag on existing deployments. Seeds are updated
-- separately so fresh deploys include her from the start.
--
-- Idempotent: safe to re-run.
-- ============================================================

do $$
declare
  nn_id uuid;
begin
  select id into nn_id
  from public.weddings
  where invite_code = 'NEHANAVEEN2026';

  if nn_id is null then
    raise notice 'Wedding NEHANAVEEN2026 not present in this env; skipping.';
    return;
  end if;

  update public.guests
  set is_bridal_party = true
  where wedding_id = nn_id
    and canonical_name = 'Aya Nath';
end $$;
