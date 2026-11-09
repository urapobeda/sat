begin;

-- Match the conflict target used by the practice grading endpoint.
-- Duplicate historical rows abort this migration instead of being removed.
create unique index if not exists practice_answers_session_question_key
  on public.practice_answers (session_id, question_id);

alter table public.practice_answers add column if not exists time_spent_seconds integer;
alter table public.practice_sessions enable row level security;
alter table public.practice_answers enable row level security;
grant select, update on public.practice_sessions to service_role;
grant select, insert, update on public.practice_answers to service_role;

-- Browser clients can start an owned session and read their own saved work.
do $$
declare
  relation text;
begin
  foreach relation in array array['practice_sessions', 'practice_answers']
  loop
    execute format('drop policy if exists practice_owner_guard on public.%I', relation);
    execute format('create policy practice_owner_guard on public.%I as restrictive
      for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', relation);
    execute format('drop policy if exists practice_owner_read on public.%I', relation);
    execute format('create policy practice_owner_read on public.%I
      for select to authenticated using (auth.uid() = user_id)', relation);
  end loop;
end $$;
grant select on public.practice_sessions, public.practice_answers to authenticated;
grant insert (user_id, section, topic, difficulty, total) on public.practice_sessions to authenticated;
drop policy if exists practice_owner_create on public.practice_sessions;
create policy practice_owner_create on public.practice_sessions
  for insert to authenticated with check (auth.uid() = user_id);

create table if not exists public.question_marks (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  marked_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

alter table public.question_marks enable row level security;
revoke all on public.question_marks from public, anon;
grant select, insert, delete on public.question_marks to authenticated;

drop policy if exists question_marks_owner_guard on public.question_marks;
create policy question_marks_owner_guard on public.question_marks as restrictive
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists question_marks_owner_access on public.question_marks;
create policy question_marks_owner_access on public.question_marks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason text not null check (reason in ('incorrect_answer', 'typo', 'display', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  created_at timestamptz not null default now(),
  unique (reporter_id, question_id)
);
create index if not exists question_reports_created_at_idx on public.question_reports (created_at desc);

alter table public.question_reports enable row level security;
revoke all on public.question_reports from public, anon, authenticated;
grant insert (question_id, reason, details) on public.question_reports to authenticated;

drop policy if exists question_reports_own_insert on public.question_reports;
create policy question_reports_own_insert on public.question_reports
  for insert to authenticated with check (auth.uid() = reporter_id);

notify pgrst, 'reload schema';
commit;
