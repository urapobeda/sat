-- Apply before deploying the AI Tutor route. Preserves all existing student data.
begin;

create table if not exists public.ai_tutor_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  count integer not null default 0 check (count between 0 and 30),
  primary key (user_id, date)
);

alter table public.ai_tutor_usage enable row level security;

revoke all on table public.ai_tutor_usage from public, anon, authenticated;
grant select on table public.ai_tutor_usage to authenticated;
grant select, insert, update on table public.ai_tutor_usage to service_role;

drop policy if exists ai_tutor_usage_select_own on public.ai_tutor_usage;
create policy ai_tutor_usage_select_own on public.ai_tutor_usage
  for select to authenticated using ((select auth.uid()) = user_id);

-- Only the trusted API may reserve quota for its already verified user.
-- The server/database clock defines the day (UTC); clients cannot change it.
-- ON CONFLICT locks the row, preventing concurrent requests from exceeding 30.
create or replace function public.consume_ai_tutor_usage(p_user_id uuid)
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  insert into public.ai_tutor_usage as usage (user_id, date, count)
  values (p_user_id, (statement_timestamp() at time zone 'UTC')::date, 1)
  on conflict (user_id, date) do update
    set count = usage.count + 1
    where usage.count < 30
  returning count;
$$;

revoke all on function public.consume_ai_tutor_usage(uuid) from public, anon, authenticated;
grant execute on function public.consume_ai_tutor_usage(uuid) to service_role;

notify pgrst, 'reload schema';
commit;
