-- ============================================================
-- Migration 006: Expand reset_demo_wedding() to cover packing + replies
-- ============================================================
-- Follow-up to migration 005. The initial reset RPC wiped
-- notifications, notification_reactions, song_requests, and cleared
-- user-editable guest_info fields — but missed two per-user tables
-- that Preview Guest can write to:
--
--   - packing_checklist      (checked-item state per guest)
--   - notification_replies   (replies to admin notifications)
--
-- Without cleaning these, a curious couple tapping "Try the demo →"
-- could see another user's checked-off packing items or stale replies
-- under the welcome message.
--
-- `create or replace` safely upgrades the function whether or not 005
-- has been applied first.
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
  -- 1. Wipe user-added / user-state content scoped to this wedding.
  delete from public.notification_replies   where wedding_id = demo_wedding_id;
  delete from public.notification_reactions where wedding_id = demo_wedding_id;
  delete from public.notifications          where wedding_id = demo_wedding_id;
  delete from public.song_requests          where wedding_id = demo_wedding_id;
  delete from public.packing_checklist      where wedding_id = demo_wedding_id;

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
