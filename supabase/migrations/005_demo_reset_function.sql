-- ============================================================
-- Migration 005: Demo-wedding reset RPC (Tetherly)
-- ============================================================
-- Curious couples who tap "Try the demo →" on the invite screen log
-- in as "Preview Guest" on a shared tenant wedding
-- (a0000000-0000-0000-0000-000000000002). Without any cleanup, song
-- requests / hotel info / message reactions that one user adds would
-- linger for the next person, so the demo drifts away from the seed
-- over time.
--
-- This migration adds a `public.reset_demo_wedding()` function that
-- wipes user-added content and re-applies the seed for JUST the
-- demo wedding. The client calls it via an RPC right before logging
-- the Preview Guest in.
--
-- Scoped to the hardcoded demo tenant id — by design the function
-- cannot touch any other wedding even if invoked with no arguments.
-- Safe to grant to anon so the unauthenticated app can call it.
-- ============================================================

begin;

create or replace function public.reset_demo_wedding()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  demo_wedding_id constant uuid := 'a0000000-0000-0000-0000-000000000002';
begin
  -- 1. Wipe user-added content that sits under this wedding.
  delete from public.notification_reactions where wedding_id = demo_wedding_id;
  delete from public.notifications          where wedding_id = demo_wedding_id;
  delete from public.song_requests          where wedding_id = demo_wedding_id;

  -- 2. Reset user-editable guest_info fields back to empty. Meal
  --    selections + rehearsal_dinner attendance are kept (they're
  --    "pre-collected" data the couple would have populated when
  --    provisioning the wedding — not something a guest edits).
  update public.guest_info
     set hotel         = '',
         check_in      = '',
         check_out     = '',
         arrival_time  = '',
         flight_number = '',
         extra_notes   = '',
         phone         = '',
         push_token    = null
   where wedding_id = demo_wedding_id;

  -- 3. Re-seed the welcome notification (mirror of seed_demo_wedding.sql).
  insert into public.notifications (wedding_id, message, sender) values
    (demo_wedding_id,
     'Welcome to our wedding app! Tap into each tab to explore the schedule, the Switzerland guide, your packing list, and more. We can''t wait to celebrate with you.',
     'Emma & James');

  -- 4. Re-seed the sample song requests (mirror of seed_demo_wedding.sql).
  insert into public.song_requests (wedding_id, song, artist, requested_by) values
    (demo_wedding_id, 'Dancing Queen',             'ABBA',               'Taylor'),
    (demo_wedding_id, 'September',                 'Earth, Wind & Fire', 'Jordan'),
    (demo_wedding_id, 'Can''t Stop the Feeling',   'Justin Timberlake',  'Sam'),
    (demo_wedding_id, 'Mr. Brightside',            'The Killers',        'Alex');
end;
$$;

grant execute on function public.reset_demo_wedding() to anon, authenticated;

commit;
