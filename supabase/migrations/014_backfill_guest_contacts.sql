-- ============================================================
-- Migration 014: Backfill guest contact info + rename Riva Kumar → Riva Raiker
-- ============================================================
-- Three things happen here, in order:
--
--   1. Rename Riva Kumar → Riva Raiker across every table that keys on the
--      guest's display name. Riva is the bride's guest from the Kumar side
--      whose actual surname is Raiker — the seed had the wrong name.
--
--   2. Force-overwrite Pathmanaban Raj's email. The seed had a stale address;
--      pathmanaban.raj@gmail.com is the canonical one.
--
--   3. Additively fill missing emails and phones for ~28 guests that were
--      missing contact info (or only had one of the two fields). The CASE
--      guard ensures we never clobber a value the guest may have entered
--      themselves via the app — only empty fields get filled.
--
-- Safe to re-run: each step is idempotent (rename guards against existing
-- target row, overwrite is a single fixed value, backfill only touches
-- empty fields).
-- ============================================================

begin;

-- ─── 1) Rename Riva Kumar → Riva Raiker ──────────────────────────────────────
-- guests.canonical_name and guest_info.guest_name both have unique constraints,
-- so the NOT EXISTS guards prevent unique-violation errors on re-run.

UPDATE public.guests
   SET canonical_name = 'Riva Raiker'
 WHERE wedding_id = '00000000-0000-0000-0000-000000000001'
   AND canonical_name = 'Riva Kumar'
   AND NOT EXISTS (
     SELECT 1 FROM public.guests g2
      WHERE g2.wedding_id = '00000000-0000-0000-0000-000000000001'
        AND g2.canonical_name = 'Riva Raiker'
   );

UPDATE public.guest_info
   SET guest_name = 'Riva Raiker'
 WHERE guest_name = 'Riva Kumar'
   AND NOT EXISTS (
     SELECT 1 FROM public.guest_info gi2 WHERE gi2.guest_name = 'Riva Raiker'
   );

UPDATE public.packing_checklist
   SET guest_name = 'Riva Raiker'
 WHERE guest_name = 'Riva Kumar'
   AND NOT EXISTS (
     SELECT 1 FROM public.packing_checklist pc2 WHERE pc2.guest_name = 'Riva Raiker'
   );

-- These two tables don't constrain guest_name to be unique, so a plain UPDATE
-- is fine and stays correct on re-run (zero rows match the second time).
UPDATE public.notification_reactions SET guest_name = 'Riva Raiker' WHERE guest_name = 'Riva Kumar';
UPDATE public.notification_replies   SET guest_name = 'Riva Raiker' WHERE guest_name = 'Riva Kumar';


-- ─── 2) Force-overwrite Pathmanaban Raj's email ──────────────────────────────
UPDATE public.guest_info
   SET email = 'pathmanaban.raj@gmail.com'
 WHERE guest_name = 'Pathmanaban Raj';


-- ─── 3) Additive contact backfill ────────────────────────────────────────────
-- Only fills fields that are currently empty in guest_info. Never overwrites
-- a value a guest may have updated themselves via the app.
UPDATE public.guest_info AS g
   SET
     email = CASE WHEN c.email != '' AND g.email = '' THEN c.email ELSE g.email END,
     phone = CASE WHEN c.phone != '' AND g.phone = '' THEN c.phone ELSE g.phone END
  FROM (VALUES
    -- Wedding-party / family that were missing contact info
    ('Connor Franklin',        'connorfranklin0706@gmail.com',     '9195610660'),
    ('Edel Dhuibheanaigh',     '',                                 '9784894459'),
    ('Leon Mirson',            '',                                 '2158344180'),
    ('Rushil Sheth',           '',                                 '5047152836'),
    ('Karam Tatla',            '',                                 '5135327269'),
    ('Sainath Palani',         'palanisainath@gmail.com',          '9082279659'),
    -- Shared inbox with Prabakaran Vasan, per provided list
    ('Kannagi Prabakaran',     'mmmepraba@yahoo.fr',               ''),
    ('Sadhana Kumar',          '',                                 '407 928-7371'),
    ('Riva Raiker',            'RivaRaiker@gmail.com',             '727 459-0814'),
    ('Jaya Kumar',             'jayabadhwar@gmail.com',            '407 454-3599'),
    ('Sanjay Mishra',          'razorbackmishra@hotmail.com',      ''),
    ('Seema Verma',            'sverma46032@gmail.com',            '317 809-8536'),
    ('Shaan Mishra',           'shaanvermamishra@gmail.com',       '317 500-0066'),
    ('Maya Mishra',            'mayavmishra@gmail.com',            ''),
    ('Anand Tewari',           'atewari@ecaa.com',                 ''),
    ('Sangita Tewari',         'sangitewari@gmail.com',            '252 916-9257'),
    ('Jeevan Tewari',          'jeevantewariisme@gmail.com',       ''),
    ('Lauren Bordeaux',        'laurenalexandria21@gmail.com',     '252 314-5473'),
    ('Ravi Tewari',            'raviandtali@gmail.com',            '252 481-2323'),
    ('Tali Tudryn',            '',                                 '239 287-1682'),
    ('Kirin Upadhyay',         '',                                 '630 881-8666'),
    ('Serena Upadhyay',        '',                                 '630 881-7599'),
    ('Gugu Chohan',            '',                                 '714 858-4538'),
    ('Bhavika Patel',          '',                                 '9082476067'),
    ('Radhika Kirpalani',      '',                                 '617 470-5870'),
    ('Nitya Srikishen',        '',                                 '256 783-1436'),
    ('Asokan Selvaraj',        'askselva1@gmail.com',              '+1 858 829 2445'),
    ('Sujatha Asokan',         'sujivenk35@gmail.com',             '+1 858 449 4554')
  ) AS c(guest_name, email, phone)
 WHERE g.guest_name = c.guest_name;

commit;
