-- ============================================================
-- Migration 041: guest_groups + guest_group_members
-- ============================================================
-- Admin-managed labels for arbitrary subsets of a wedding's guest
-- roster. Examples: "Wedding party", "Bridesmaids", "Groomsmen",
-- "Family", "College friends". Independent of the built-in wedding-
-- party / bridal-party flags — those stay the source of truth for
-- event visibility and the packing list; groups are additional labels
-- an admin can define per wedding and pair with future features
-- (custom event visibility, filtered chats, per-group packing tips).
--
-- Two tables:
--   guest_groups         one row per label, scoped by wedding_id
--   guest_group_members  many-to-many between guests and groups
--
-- A guest can belong to many groups and a group can contain many
-- guests. Membership uses (wedding_id, guest_canonical_name) to
-- match the guests table's composite uniqueness key — this keeps the
-- join simple and mirrors how the rest of the app (packing_checklist,
-- guest_info) already identifies guests.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

create table if not exists public.guest_groups (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  name        text not null,
  -- Optional short description surfaced in the admin UI so a couple
  -- can remember what a group is for when they come back to it.
  description text,
  -- Optional Ionicons name (e.g. 'heart', 'people', 'flower') so the
  -- admin picker + any future consumer can render an icon alongside
  -- the label. NULL means "no icon; render a default".
  icon        text,
  -- Stable ordering for the admin list so groups don't jump around
  -- as they're renamed. Filled by the client with the next available
  -- integer when a group is created.
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (wedding_id, name)
);

create index if not exists guest_groups_wedding_sort_idx
  on public.guest_groups (wedding_id, sort_order);

create table if not exists public.guest_group_members (
  group_id              uuid not null references public.guest_groups(id) on delete cascade,
  wedding_id            uuid not null references public.weddings(id) on delete cascade,
  guest_canonical_name  text not null,
  created_at            timestamptz not null default now(),
  primary key (group_id, guest_canonical_name),
  -- Composite FK back to guests so a group can only contain names
  -- that actually exist on the roster; renaming or deleting a guest
  -- (either via cascade from weddings or an explicit delete) removes
  -- them from every group they were in.
  foreign key (wedding_id, guest_canonical_name)
    references public.guests (wedding_id, canonical_name)
    on delete cascade
    on update cascade
);

create index if not exists guest_group_members_wedding_guest_idx
  on public.guest_group_members (wedding_id, guest_canonical_name);

alter table public.guest_groups        enable row level security;
alter table public.guest_group_members enable row level security;

drop policy if exists "allow_all_guest_groups"        on public.guest_groups;
drop policy if exists "allow_all_guest_group_members" on public.guest_group_members;

create policy "allow_all_guest_groups"
  on public.guest_groups for all using (true) with check (true);
create policy "allow_all_guest_group_members"
  on public.guest_group_members for all using (true) with check (true);

commit;
