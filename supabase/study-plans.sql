create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_score integer not null default 1500,
  exam_date date not null,
  weekly_goal integer not null default 120,
  daily_goal integer not null default 25,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_plans_user_id_key unique (user_id),
  constraint study_plans_target_score_check check (target_score between 400 and 1600),
  constraint study_plans_weekly_goal_check check (weekly_goal > 0),
  constraint study_plans_daily_goal_check check (daily_goal > 0)
);

create index if not exists study_plans_user_id_idx on public.study_plans (user_id);

alter table public.study_plans enable row level security;

grant select, insert, update, delete on public.study_plans to authenticated;

drop policy if exists "Users can read their study plan" on public.study_plans;
create policy "Users can read their study plan"
on public.study_plans for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their study plan" on public.study_plans;
create policy "Users can insert their study plan"
on public.study_plans for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their study plan" on public.study_plans;
create policy "Users can update their study plan"
on public.study_plans for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their study plan" on public.study_plans;
create policy "Users can delete their study plan"
on public.study_plans for delete
to authenticated
using (auth.uid() = user_id);
