alter table public.questions
add column if not exists is_bluebook boolean not null default false;

create index if not exists questions_is_bluebook_idx
on public.questions (is_bluebook);

create table if not exists public.question_marks (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  marked_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists question_marks_user_id_idx
on public.question_marks (user_id);

create index if not exists question_marks_question_id_idx
on public.question_marks (question_id);

alter table public.question_marks enable row level security;

grant select, insert, update, delete on public.question_marks to authenticated;

drop policy if exists "Users can read their question marks" on public.question_marks;
create policy "Users can read their question marks"
on public.question_marks for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their question marks" on public.question_marks;
create policy "Users can insert their question marks"
on public.question_marks for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their question marks" on public.question_marks;
create policy "Users can update their question marks"
on public.question_marks for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their question marks" on public.question_marks;
create policy "Users can delete their question marks"
on public.question_marks for delete
to authenticated
using (auth.uid() = user_id);
