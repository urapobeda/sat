-- Read-only verification after add_live_lessons.sql.
select relname,relrowsecurity from pg_class where oid in
  ('public.live_sessions'::regclass,'public.live_answers'::regclass,'public.live_session_roster'::regclass);
select tablename,policyname,cmd,qual,with_check from pg_policies
  where schemaname='public' and tablename in ('live_sessions','live_answers','live_session_roster') order by tablename,policyname;
select tablename from pg_publication_tables where pubname='supabase_realtime'
  and schemaname='public' and tablename in ('live_sessions','live_answers') order by tablename;
select
  has_table_privilege('authenticated','public.live_answers','INSERT') as browser_insert_must_be_false,
  has_table_privilege('authenticated','public.live_sessions','UPDATE') as browser_update_must_be_false,
  has_function_privilege('authenticated','public.submit_verified_live_answer(uuid,uuid,uuid,text,boolean)','EXECUTE') as browser_grade_must_be_false,
  has_function_privilege('anon','public.get_live_snapshot(text)','EXECUTE') as anonymous_read_must_be_false,
  has_table_privilege('service_role','public.live_answers','SELECT') as service_read_must_be_true;
-- In the app, test with a teacher, their student and a student from another group:
-- Start -> student submits -> teacher sees letter + verdict -> student verdict stays hidden.
-- Reveal -> student sees only their verdict. Inspect direct live_answers SELECT: no rows.
-- Next -> student screen changes without a refresh. Old-question submissions are rejected.
-- Finish -> submissions close; reload lesson and verify persisted Group answers.
-- Disable/re-enable the network; the screen must recover the latest state.
-- Foreign teacher/student must be denied even when they know the join code.
