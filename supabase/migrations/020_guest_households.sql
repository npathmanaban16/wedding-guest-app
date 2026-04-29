-- ============================================================
-- Migration 020: Households on guests
-- ============================================================
-- Adds an optional `household_id` integer column to public.guests so the
-- admin Guest Accommodations view can group household members together.
-- Useful both for visual pairing and for spotting whose info is still
-- missing (e.g. one half of a couple has filled the form, the other hasn't).
--
-- This is a grouping-only change — guest_info is unchanged, no values are
-- copied between household members. household_id is nullable; guests not
-- in a household (vendors, planner, anyone unmapped) appear as solo cards
-- in the admin view.
--
-- Backfill targets the N&N wedding (00000000-0000-0000-0000-000000000001)
-- using the IDs from the couple's master spreadsheet so the numbers match
-- if cross-referenced. Safe to re-run: each UPDATE is keyed on the
-- canonical name and the wedding_id, and the column add is `if not exists`.
-- ============================================================

begin;

alter table public.guests
  add column if not exists household_id integer;

create index if not exists guests_wedding_household_idx
  on public.guests (wedding_id, household_id);

-- ─── Backfill: N&N wedding ───────────────────────────────────────────────────
update public.guests AS g
   set household_id = h.household_id
  from (VALUES
    (1,   'Neha Pathmanaban'),
    (1,   'Naveen Nath'),
    (3,   'Pathmanaban Raj'),
    (3,   'Kalpana Pathmanaban'),
    (4,   'Vishnu Pathmanaban'),
    (5,   'Amar Nath'),
    (5,   'Sandhya Nath'),
    (6,   'Neel Nath'),
    (6,   'Aya Nath'),
    (7,   'Olivia Zhu'),
    (8,   'Akanksha Singh'),
    (8,   'Suhail Goyal'),
    (9,   'Sayantanee Das'),
    (9,   'Guhan Muruganandam'),
    (10,  'Ritika Patil'),
    (10,  'Kevin Labagnara'),
    (11,  'Gaurie Mittal'),
    (11,  'Sai Avala'),
    (12,  'Nikila Vasudevan'),
    (12,  'Goutham Subramanian'),
    (13,  'Liz Paulino'),
    (14,  'Andrew Ball'),
    (14,  'Connor Franklin'),
    (15,  'Alec Mirchandani'),
    (15,  'Eleni Karandreas'),
    (16,  'Alex Shih'),
    (16,  'Nancy Kwan'),
    (18,  'Jedidiah Glass'),
    (18,  'Edel Dhuibheanaigh'),
    (19,  'Elliott Baker'),
    (19,  'Mary Dick'),
    (20,  'Andrew You'),
    (23,  'Jason Luo'),
    (25,  'Grace Mutoko'),
    (25,  'Paul Mas'),
    (28,  'Sankash Shankar'),
    (31,  'Bhavya Varma'),
    (31,  'Leon Mirson'),
    (32,  'Moeko Nagatsuka'),
    (32,  'Rushil Sheth'),
    (34,  'Tithi Raval'),
    (35,  'Karam Tatla'),
    (36,  'Jenna Freedman'),
    (40,  'Ben Biswas'),
    (40,  'Danielle Skelly'),
    (42,  'Subbarao Addaganti'),
    (42,  'Anitha Addaganti'),
    (42,  'Yash Addaganti'),
    (42,  'Trisha Addaganti'),
    (43,  'Prasanna Bekal'),
    (43,  'Vindhya Bekal'),
    (43,  'Pallavi Bekal'),
    (43,  'Tanvi Bekal'),
    (44,  'Ram Sankaran'),
    (44,  'Uma Ramanathan'),
    (44,  'Rahul Ramanathan'),
    (45,  'Abhay Mhatre'),
    (45,  'Archana Mhatre'),
    (46,  'Madhu Somenhalli'),
    (46,  'Shashi Somenhalli'),
    (46,  'Nithin Somenhalli'),
    (49,  'Anand Palani'),
    (49,  'Sujatha Palani'),
    (49,  'Arthi Palani'),
    (49,  'Sainath Palani'),
    (50,  'Vivek Seth'),
    (50,  'Ashvani Vivek'),
    (51,  'Saravanan Kandaswamy'),
    (52,  'Chrisvin Jabamani'),
    (53,  'Howard Li'),
    (57,  'Lingesh Radjou'),
    (58,  'Rajesh Radjou'),
    (60,  'Prabakaran Vasan'),
    (60,  'Kannagi Prabakaran'),
    (63,  'Neha Dubey'),
    (64,  'Pooja Dubey'),
    (65,  'Rakesh Dubey'),
    (65,  'Neelu Dubey'),
    (69,  'Vijay Kumar'),
    (69,  'Sadhana Kumar'),
    (70,  'Vikas Kumar'),
    (70,  'Riva Raiker'),
    (71,  'Vivek Kumar'),
    (71,  'Jaya Kumar'),
    (74,  'Sanjay Mishra'),
    (74,  'Seema Verma'),
    (74,  'Shaan Mishra'),
    (75,  'Maya Mishra'),
    (78,  'Anand Tewari'),
    (78,  'Sangita Tewari'),
    (79,  'Jeevan Tewari'),
    (79,  'Lauren Bordeaux'),
    (80,  'Ravi Tewari'),
    (80,  'Tali Tudryn'),
    (81,  'Sanjiv Upadhyay'),
    (81,  'Meena Upadhyay'),
    (81,  'Archana Upadhyay'),
    (82,  'Kirin Upadhyay'),
    (83,  'Serena Upadhyay'),
    (83,  'Matt Uthupan'),
    (86,  'Tushita Shrivastav'),
    (86,  'Gugu Chohan'),
    (89,  'Dennis Porto'),
    (89,  'Jan Porto'),
    (91,  'Diane Hedden'),
    (94,  'Mary Kay Buchsbaum'),
    (94,  'Bruce Buchsbaum'),
    (95,  'Bruce Baker'),
    (95,  'Kelli Baker'),
    (99,  'Roshan Ram'),
    (101, 'Bhavika Patel'),
    (101, 'Jinesh Patel'),
    (104, 'Radhika Kirpalani'),
    (104, 'Tarun Kirpalani'),
    (105, 'Nitya Srikishen'),
    (105, 'Puneet Lakhi'),
    (111, 'Marwan Bayoumy'),
    (112, 'Asokan Selvaraj'),
    (112, 'Sujatha Asokan')
  ) AS h(household_id, canonical_name)
 where g.wedding_id = '00000000-0000-0000-0000-000000000001'
   and g.canonical_name = h.canonical_name;

commit;
