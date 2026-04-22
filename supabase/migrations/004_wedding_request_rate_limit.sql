-- ============================================================
-- Migration 004: Rate-limit public wedding-request inserts
-- ============================================================
-- The `wedding_requests` intake is exposed to the anon key, so
-- anyone can POST rows. Add a simple BEFORE INSERT trigger that
-- blocks rapid duplicate submissions from the same email.
--
-- Two guardrails:
--   1. Per-email cooldown: reject if the same email has already
--      submitted a request in the last 60 seconds.
--   2. Per-IP/day cap is not enforced here because we don't have
--      the IP address in postgres; instead the client carries a
--      honeypot field (`website`) which, if non-empty, causes the
--      edge function to silently drop the request.
--
-- Safe to re-run (idempotent).
-- ============================================================

begin;

create or replace function public.enforce_wedding_request_rate_limit()
returns trigger
language plpgsql
as $$
declare
  recent_count int;
begin
  select count(*)
    into recent_count
    from public.wedding_requests
   where lower(email) = lower(new.email)
     and created_at > now() - interval '60 seconds';

  if recent_count > 0 then
    raise exception 'rate_limited: please wait a minute before submitting another request'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists wedding_requests_rate_limit on public.wedding_requests;
create trigger wedding_requests_rate_limit
  before insert on public.wedding_requests
  for each row execute function public.enforce_wedding_request_rate_limit();

-- Helpful index for the rate-limit lookup above and for any future
-- "list by email" admin view.
create index if not exists wedding_requests_email_created_idx
  on public.wedding_requests (lower(email), created_at desc);

commit;
