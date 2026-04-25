-- ============================================================
-- Migration 012: Reject disposable-email wedding requests
-- ============================================================
-- The `wedding_requests` intake is exposed to the anon key, so
-- client-side validation alone can be bypassed by hitting the
-- REST endpoint directly. Mirror the disposable-domain blocklist
-- in a BEFORE INSERT trigger so the database is the source of
-- truth.
--
-- Domain list mirrors constants/disposableEmailDomains.ts —
-- keep both in sync when adding entries.
--
-- Safe to re-run (idempotent).
-- ============================================================

begin;

create or replace function public.enforce_wedding_request_disposable_email()
returns trigger
language plpgsql
as $$
declare
  domain text;
  blocklist text[] := array[
    '10minutemail.com',
    'dispostable.com',
    'emailondeck.com',
    'fakeinbox.com',
    'getnada.com',
    'guerrillamail.com',
    'guerrillamail.net',
    'guerrillamailblock.com',
    'mailcatch.com',
    'maildrop.cc',
    'mailinator.com',
    'mintemail.com',
    'mohmal.com',
    'sharklasers.com',
    'spam4.me',
    'spamgourmet.com',
    'temp-mail.org',
    'tempmail.com',
    'tempmailaddress.com',
    'throwawaymail.com',
    'trashmail.com',
    'yopmail.com'
  ];
begin
  domain := lower(split_part(new.email, '@', 2));
  if domain = any(blocklist) then
    raise exception 'disposable_email: please use a non-disposable email address'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists wedding_requests_disposable_email on public.wedding_requests;
create trigger wedding_requests_disposable_email
  before insert on public.wedding_requests
  for each row execute function public.enforce_wedding_request_disposable_email();

commit;
