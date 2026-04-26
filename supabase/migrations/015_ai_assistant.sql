-- ============================================================
-- Migration 015: AI Assistant — guest Q&A history
-- ============================================================
-- Backs the floating "Ask" assistant: every question + answer is logged
-- per (wedding_id, guest_name) so the chat modal can show prior threads,
-- and so the couple has a record of what guests are actually asking
-- (gold for updating the schedule / Switzerland guide / FAQ surfaces).
--
-- `tab_context` records which screen the question was asked from
-- ('schedule', 'packing', 'switzerland', etc.) so per-tab analytics and
-- contextual follow-ups stay possible. Nullable — questions asked from
-- the home tab or from the history view leave it null.
--
-- Safe to re-run: `if not exists` guards on every object.
-- ============================================================

create table if not exists public.ai_questions (
  id            uuid primary key default gen_random_uuid(),
  wedding_id    uuid not null references public.weddings(id) on delete cascade,
  guest_name    text not null,
  question      text not null,
  answer        text not null,
  tab_context   text,
  created_at    timestamptz not null default now()
);

create index if not exists ai_questions_wedding_guest_idx
  on public.ai_questions (wedding_id, guest_name, created_at desc);

alter table public.ai_questions enable row level security;

-- Permissive policy in line with the rest of the schema. Guest identity
-- is enforced at the application layer; tightening to per-wedding RLS
-- happens alongside the broader auth migration, not here.
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename  = 'ai_questions'
       and policyname = 'allow_all_ai_questions'
  ) then
    create policy "allow_all_ai_questions"
      on public.ai_questions for all using (true) with check (true);
  end if;
end $$;
