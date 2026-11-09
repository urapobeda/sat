begin;

-- The dashboard reads saved test sessions using the signed-in student's role.
alter table public.test_sessions enable row level security;

drop policy if exists test_sessions_history_owner_guard on public.test_sessions;
create policy test_sessions_history_owner_guard
  on public.test_sessions as restrictive
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists test_sessions_history_owner_read on public.test_sessions;
create policy test_sessions_history_owner_read
  on public.test_sessions
  for select to authenticated
  using (auth.uid() = user_id);

grant select on public.test_sessions to authenticated;
commit;
