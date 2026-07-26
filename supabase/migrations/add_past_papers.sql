create extension if not exists pgcrypto;

create table if not exists public.exam_papers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  paper_type text not null check (paper_type in ('full-length', 'reading-writing', 'math', 'mini-test')),
  mode text not null check (mode in ('adaptive', 'linear', 'untimed-practice')),
  difficulty text not null check (difficulty in ('foundation', 'standard', 'advanced')),
  year integer check (year is null or year between 2000 and 2100),
  source_type text not null check (source_type in ('original', 'licensed', 'public-permission')),
  source_name text,
  source_url text,
  license_notes text,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_papers_publish_source_check check (
    is_published = false or (source_type is not null and coalesce(source_name, '') <> '' and coalesce(license_notes, '') <> '')
  )
);

create index if not exists exam_papers_slug_idx on public.exam_papers (slug);
create index if not exists exam_papers_is_published_idx on public.exam_papers (is_published);
create index if not exists exam_papers_filters_idx on public.exam_papers (paper_type, mode, difficulty, source_type, year);

create table if not exists public.exam_modules (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.exam_papers(id) on delete cascade,
  section text not null check (section in ('math', 'reading-writing')),
  module_number integer not null check (module_number > 0),
  route_type text check (route_type is null or route_type in ('base', 'easier', 'harder')),
  duration_seconds integer not null check (duration_seconds > 0),
  question_count integer not null check (question_count > 0),
  sort_order integer not null check (sort_order > 0)
);

create index if not exists exam_modules_paper_id_idx on public.exam_modules (paper_id);
create index if not exists exam_modules_section_idx on public.exam_modules (section);
create unique index if not exists exam_modules_unique_route_idx
on public.exam_modules (paper_id, section, module_number, coalesce(route_type, 'base'));

create table if not exists public.exam_module_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.exam_modules(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  sort_order integer not null check (sort_order > 0),
  unique (module_id, question_id),
  unique (module_id, sort_order)
);

create index if not exists exam_module_questions_module_id_idx on public.exam_module_questions (module_id);
create index if not exists exam_module_questions_question_id_idx on public.exam_module_questions (question_id);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_id uuid not null references public.exam_papers(id) on delete cascade,
  selected_section text check (selected_section is null or selected_section in ('math', 'reading-writing', 'full')),
  status text not null check (status in ('not-started', 'in-progress', 'completed')),
  current_module_id uuid references public.exam_modules(id) on delete set null,
  current_question_index integer not null default 0 check (current_question_index >= 0),
  raw_score integer check (raw_score is null or raw_score >= 0),
  estimated_score integer check (estimated_score is null or estimated_score between 400 and 1600),
  reading_writing_score integer check (reading_writing_score is null or reading_writing_score between 200 and 800),
  math_score integer check (math_score is null or math_score between 200 and 800),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0)
);

create index if not exists exam_attempts_user_id_idx on public.exam_attempts (user_id);
create index if not exists exam_attempts_paper_id_idx on public.exam_attempts (paper_id);
create index if not exists exam_attempts_status_idx on public.exam_attempts (status);

create table if not exists public.exam_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.exam_modules(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_answer text,
  is_correct boolean,
  marked_for_review boolean not null default false,
  time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0),
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index if not exists exam_attempt_answers_attempt_id_idx on public.exam_attempt_answers (attempt_id);
create index if not exists exam_attempt_answers_user_id_idx on public.exam_attempt_answers (user_id);
create index if not exists exam_attempt_answers_question_id_idx on public.exam_attempt_answers (question_id);

create table if not exists public.paper_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_id uuid not null references public.exam_papers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, paper_id)
);

create index if not exists paper_bookmarks_user_id_idx on public.paper_bookmarks (user_id);
create index if not exists paper_bookmarks_paper_id_idx on public.paper_bookmarks (paper_id);

alter table public.exam_papers enable row level security;
alter table public.exam_modules enable row level security;
alter table public.exam_module_questions enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_attempt_answers enable row level security;
alter table public.paper_bookmarks enable row level security;

grant select on public.exam_papers to anon, authenticated;
grant select on public.exam_modules to anon, authenticated;
grant select on public.exam_module_questions to anon, authenticated;
grant select, insert, update, delete on public.exam_attempts to authenticated;
grant select, insert, update, delete on public.exam_attempt_answers to authenticated;
grant select, insert, update, delete on public.paper_bookmarks to authenticated;

drop policy if exists "Published papers are readable" on public.exam_papers;
create policy "Published papers are readable"
on public.exam_papers for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Published paper modules are readable" on public.exam_modules;
create policy "Published paper modules are readable"
on public.exam_modules for select
to anon, authenticated
using (
  exists (
    select 1
    from public.exam_papers
    where exam_papers.id = exam_modules.paper_id
      and exam_papers.is_published = true
  )
);

drop policy if exists "Published paper module questions are readable" on public.exam_module_questions;
create policy "Published paper module questions are readable"
on public.exam_module_questions for select
to anon, authenticated
using (
  exists (
    select 1
    from public.exam_modules
    join public.exam_papers on exam_papers.id = exam_modules.paper_id
    where exam_modules.id = exam_module_questions.module_id
      and exam_papers.is_published = true
  )
);

drop policy if exists "Users can read their exam attempts" on public.exam_attempts;
create policy "Users can read their exam attempts"
on public.exam_attempts for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their exam attempts" on public.exam_attempts;
create policy "Users can insert their exam attempts"
on public.exam_attempts for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their exam attempts" on public.exam_attempts;
create policy "Users can update their exam attempts"
on public.exam_attempts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their exam attempts" on public.exam_attempts;
create policy "Users can delete their exam attempts"
on public.exam_attempts for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their exam answers" on public.exam_attempt_answers;
create policy "Users can read their exam answers"
on public.exam_attempt_answers for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their exam answers" on public.exam_attempt_answers;
create policy "Users can insert their exam answers"
on public.exam_attempt_answers for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.exam_attempts
    where exam_attempts.id = exam_attempt_answers.attempt_id
      and exam_attempts.user_id = auth.uid()
  )
);

drop policy if exists "Users can update their exam answers" on public.exam_attempt_answers;
create policy "Users can update their exam answers"
on public.exam_attempt_answers for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their exam answers" on public.exam_attempt_answers;
create policy "Users can delete their exam answers"
on public.exam_attempt_answers for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their paper bookmarks" on public.paper_bookmarks;
create policy "Users can read their paper bookmarks"
on public.paper_bookmarks for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their paper bookmarks" on public.paper_bookmarks;
create policy "Users can insert their paper bookmarks"
on public.paper_bookmarks for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their paper bookmarks" on public.paper_bookmarks;
create policy "Users can delete their paper bookmarks"
on public.paper_bookmarks for delete
to authenticated
using (auth.uid() = user_id);
