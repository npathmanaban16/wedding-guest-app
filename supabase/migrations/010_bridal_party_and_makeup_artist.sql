-- ============================================================
-- Migration 010: bridal party + makeup_artist vendor role
-- ============================================================
-- Two related additions:
--
--   1. guests.is_bridal_party — flags the bridesmaids/bridesman, a
--      subset of the wedding party. Used by the packing tab to surface
--      bridal-party-only items (matching sweatshirts, getting-ready
--      outfits) that don't apply to the broader wedding party.
--
--   2. wedding_admins.role gains 'makeup_artist'. Like 'dj', it's a
--      vendor role: login-only, no admin powers (see WeddingContext.
--      isAdmin). The makeup artist is set as is_wedding_party=true so
--      the rehearsal-dinner schedule entry isn't auto-hidden.
--
-- Idempotent: safe to re-run.

-- ─── Schema changes ──────────────────────────────────────────────

alter table public.guests
  add column if not exists is_bridal_party boolean not null default false;

alter table public.wedding_admins
  drop constraint if exists wedding_admins_role_check;

alter table public.wedding_admins
  add constraint wedding_admins_role_check
  check (role in ('planner', 'dj', 'makeup_artist'));


-- ─── N&N data ────────────────────────────────────────────────────
-- Resolve the N&N wedding id via invite code so this works against
-- both seed.sql and seed_saas.sql tenants.

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

  -- Bridesmaids / Bridesman.
  update public.guests
  set is_bridal_party = true
  where wedding_id = nn_id
    and canonical_name in (
      'Olivia Zhu',
      'Akanksha Singh',
      'Sayantanee Das',
      'Ritika Patil',
      'Gaurie Mittal',
      'Nikila Vasudevan',
      'Liz Paulino',
      'Andrew Ball'
    );

  -- Makeup artist. Logs in as "Shilpa Patel". Marked wedding-party so
  -- she can see all events including the rehearsal dinner.
  -- role='makeup_artist' excludes her from admin powers in WeddingContext.
  insert into public.wedding_admins (wedding_id, guest_name, is_wedding_party, gender, role)
  values (nn_id, 'Shilpa Patel', true, 'female', 'makeup_artist')
  on conflict (wedding_id, guest_name) do update set
    is_wedding_party = excluded.is_wedding_party,
    gender           = excluded.gender,
    role             = excluded.role;
end $$;
