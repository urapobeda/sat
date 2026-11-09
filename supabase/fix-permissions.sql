-- Legacy base grants. For production upgrades use the ordered audit runbook.
-- Never restore table-wide question reads or student writes to verified grades.
begin;

alter table public.profiles enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.practice_answers enable row level security;
alter table public.test_sessions enable row level security;
alter table public.test_answers enable row level security;
alter table public.study_plans enable row level security;
alter table public.question_marks enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, delete on public.practice_sessions, public.practice_answers, public.test_sessions to authenticated;
grant delete on public.test_answers to authenticated;
grant select (id, test_session_id, user_id, question_id, selected_answer, is_correct, created_at)
  on public.test_answers to authenticated;
grant insert (user_id, section, topic, difficulty, total) on public.practice_sessions to authenticated;
grant insert (user_id, mode, total) on public.test_sessions to authenticated;
grant select, insert, update, delete on public.study_plans, public.question_marks to authenticated;

commit;
