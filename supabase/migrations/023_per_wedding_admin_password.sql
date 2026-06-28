-- Migration 023: per-wedding admin password
--
-- Replaces the client-side hardcoded `ADMIN_UNLOCK_PASSWORD` with a
-- per-wedding value stored on the weddings row. Verified via a
-- security-definer RPC so the value never reaches the client — the
-- weddings row is publicly readable (lookup by invite_code), so we
-- intentionally keep `admin_password` out of every SELECT path.
--
-- Backfills every existing wedding to 'Duke2016' (the previous global
-- value) so behaviour is unchanged on existing rows. The demo wedding
-- is then overwritten to 'demo123' so the test login is distinct from
-- the live wedding.

alter table public.weddings
  add column if not exists admin_password text;

update public.weddings
  set admin_password = 'Duke2016'
  where admin_password is null;

update public.weddings
  set admin_password = 'demo123'
  where id = 'a0000000-0000-0000-0000-000000000002';

create or replace function public.check_admin_password(
  p_wedding_id uuid,
  p_password   text
) returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.weddings
    where id = p_wedding_id
      and admin_password is not null
      and admin_password = p_password
  );
$$;

revoke all on function public.check_admin_password(uuid, text) from public;
grant execute on function public.check_admin_password(uuid, text) to anon, authenticated;
