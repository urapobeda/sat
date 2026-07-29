begin;

create table if not exists public.question_solutions (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_answer text not null,
  explanation text not null,
  solution_steps jsonb,
  scoring_metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.question_solutions (
  question_id,
  correct_answer,
  explanation
)
select
  id,
  correct_answer,
  explanation
from public.questions
where correct_answer is not null
  and explanation is not null
on conflict (question_id) do update
set
  correct_answer = excluded.correct_answer,
  explanation = excluded.explanation,
  updated_at = now();

do $$
declare
  missing_count integer;
begin
  select count(*)
  into missing_count
  from public.questions q
  left join public.question_solutions s on s.question_id = q.id
  where s.question_id is null;

  if missing_count > 0 then
    raise exception 'secure_question_solutions aborted: % questions have no solution row', missing_count;
  end if;
end $$;

alter table public.question_solutions enable row level security;

revoke all on public.question_solutions from anon, authenticated;
revoke all on public.question_solutions from public;

drop policy if exists "No public question solution reads" on public.question_solutions;

create unique index if not exists practice_answers_session_question_key
on public.practice_answers (session_id, question_id);

create unique index if not exists test_answers_session_question_key
on public.test_answers (test_session_id, question_id);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'questions'
      and column_name = 'correct_answer'
  ) then
    alter table public.questions drop column correct_answer;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'questions'
      and column_name = 'explanation'
  ) then
    alter table public.questions drop column explanation;
  end if;
end $$;

commit;
