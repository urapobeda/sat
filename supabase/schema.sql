create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('math', 'reading-writing')),
  topic text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  question text not null,
  choices jsonb not null check (jsonb_typeof(choices) = 'array'),
  correct_answer text not null,
  explanation text not null,
  created_at timestamptz default now()
);

create unique index if not exists questions_question_key on public.questions (question);
create index if not exists questions_section_idx on public.questions (section);
create index if not exists questions_topic_idx on public.questions (topic);
create index if not exists questions_difficulty_idx on public.questions (difficulty);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section text check (section is null or section in ('math', 'reading-writing')),
  topic text,
  difficulty text check (difficulty is null or difficulty in ('easy', 'medium', 'hard')),
  score int not null default 0,
  total int not null default 0,
  percentage numeric not null default 0,
  started_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists practice_sessions_user_id_idx on public.practice_sessions (user_id);

create table if not exists public.practice_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_answer text,
  correct_answer text,
  is_correct boolean,
  created_at timestamptz default now()
);

create index if not exists practice_answers_user_id_idx on public.practice_answers (user_id);
create index if not exists practice_answers_session_id_idx on public.practice_answers (session_id);

create table if not exists public.test_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text default 'mini-test',
  score int not null default 0,
  total int not null default 0,
  percentage numeric not null default 0,
  estimated_sat_score int,
  time_spent_seconds int,
  started_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists test_sessions_user_id_idx on public.test_sessions (user_id);

create table if not exists public.test_answers (
  id uuid primary key default gen_random_uuid(),
  test_session_id uuid not null references public.test_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_answer text,
  correct_answer text,
  is_correct boolean,
  created_at timestamptz default now()
);

create index if not exists test_answers_user_id_idx on public.test_answers (user_id);
create index if not exists test_answers_session_id_idx on public.test_answers (test_session_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.practice_answers enable row level security;
alter table public.test_sessions enable row level security;
alter table public.test_answers enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Questions are readable by everyone" on public.questions;
create policy "Questions are readable by everyone"
on public.questions for select
to anon, authenticated
using (true);

drop policy if exists "Users can read their practice sessions" on public.practice_sessions;
create policy "Users can read their practice sessions"
on public.practice_sessions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their practice sessions" on public.practice_sessions;
create policy "Users can insert their practice sessions"
on public.practice_sessions for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their practice sessions" on public.practice_sessions;
create policy "Users can update their practice sessions"
on public.practice_sessions for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their practice sessions" on public.practice_sessions;
create policy "Users can delete their practice sessions"
on public.practice_sessions for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their practice answers" on public.practice_answers;
create policy "Users can read their practice answers"
on public.practice_answers for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their practice answers" on public.practice_answers;
create policy "Users can insert their practice answers"
on public.practice_answers for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their practice answers" on public.practice_answers;
create policy "Users can update their practice answers"
on public.practice_answers for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their practice answers" on public.practice_answers;
create policy "Users can delete their practice answers"
on public.practice_answers for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their test sessions" on public.test_sessions;
create policy "Users can read their test sessions"
on public.test_sessions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their test sessions" on public.test_sessions;
create policy "Users can insert their test sessions"
on public.test_sessions for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their test sessions" on public.test_sessions;
create policy "Users can update their test sessions"
on public.test_sessions for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their test sessions" on public.test_sessions;
create policy "Users can delete their test sessions"
on public.test_sessions for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their test answers" on public.test_answers;
create policy "Users can read their test answers"
on public.test_answers for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their test answers" on public.test_answers;
create policy "Users can insert their test answers"
on public.test_answers for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their test answers" on public.test_answers;
create policy "Users can update their test answers"
on public.test_answers for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their test answers" on public.test_answers;
create policy "Users can delete their test answers"
on public.test_answers for delete
to authenticated
using (auth.uid() = user_id);
