begin;

alter table public.questions
add column if not exists is_bluebook boolean not null default false,
add column if not exists source_question_id text,
add column if not exists source_name text,
add column if not exists category text,
add column if not exists source_page_start integer,
add column if not exists source_page_end integer,
add column if not exists image_urls jsonb not null default '[]'::jsonb,
add column if not exists question_type text not null default 'multiple-choice'
  check (question_type in ('multiple-choice', 'student-produced-response'));

create table if not exists public.question_solutions (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_answer text not null,
  explanation text not null,
  solution_steps jsonb,
  scoring_metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'questions'
      and column_name = 'correct_answer'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'questions'
      and column_name = 'explanation'
  ) then
    execute '
      insert into public.question_solutions (question_id, correct_answer, explanation)
      select id, correct_answer, explanation
      from public.questions
      where correct_answer is not null
        and explanation is not null
      on conflict (question_id) do update
      set
        correct_answer = excluded.correct_answer,
        explanation = excluded.explanation,
        updated_at = now()
    ';
  end if;
end $$;

drop index if exists questions_source_question_id_key;

create unique index questions_source_question_id_key
on public.questions (source_question_id);

create index if not exists questions_section_idx
on public.questions (section);

create index if not exists questions_topic_idx
on public.questions (topic);

create index if not exists questions_difficulty_idx
on public.questions (difficulty);

create index if not exists questions_is_bluebook_idx
on public.questions (is_bluebook);

create index if not exists questions_category_idx
on public.questions (category);

create index if not exists questions_question_type_idx
on public.questions (question_type);

create index if not exists questions_image_urls_idx
on public.questions using gin (image_urls);

alter table public.questions enable row level security;
alter table public.question_solutions enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select on public.questions to anon, authenticated;
grant all on public.questions to service_role;
grant all on public.question_solutions to service_role;

drop policy if exists "Questions are readable by everyone" on public.questions;
drop policy if exists "Allow public read access to questions" on public.questions;
drop policy if exists "questions_select_public" on public.questions;

create policy "questions_select_public"
on public.questions
for select
to anon, authenticated
using (true);

drop policy if exists "No public question solution reads" on public.question_solutions;
drop policy if exists "question_solutions_service_role_all" on public.question_solutions;

create policy "question_solutions_service_role_all"
on public.question_solutions
for all
to service_role
using (true)
with check (true);

commit;
