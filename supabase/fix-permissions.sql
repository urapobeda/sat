grant usage on schema public to anon, authenticated;

grant select on public.questions to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.practice_sessions to authenticated;
grant select, insert, update, delete on public.practice_answers to authenticated;
grant select, insert, update, delete on public.test_sessions to authenticated;
grant select, insert, update, delete on public.test_answers to authenticated;
grant select, insert, update, delete on public.study_plans to authenticated;
grant select, insert, update, delete on public.question_marks to authenticated;
