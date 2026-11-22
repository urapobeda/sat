-- Read-only checks after add_course_materials.sql in the Supabase SQL editor.
-- Each listed table must have RLS enabled. The mistake ledger has no browser grants.
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('course_materials','student_question_flags','student_question_mistakes');
select tablename,policyname,cmd,roles,qual,with_check from pg_policies
where schemaname='public' and tablename in ('course_materials','student_question_flags','student_question_mistakes');
select has_table_privilege('authenticated','public.student_question_mistakes','select') as ledger_must_be_false,
  has_table_privilege('anon','public.course_materials','select') as anonymous_must_be_false,
  has_table_privilege('service_role','public.course_materials','select,insert,update,delete') as service_must_be_true,
  has_column_privilege('authenticated','public.course_materials','created_by','update') as author_update_must_be_false;
select p.proname,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('list_course_materials','list_my_hard_questions','my_hard_question_signals','capture_question_mistake');
select event_object_table,trigger_name from information_schema.triggers
where trigger_schema='public' and trigger_name in ('capture_question_mistake','validate_material_lesson');
select indexname,indexdef from pg_indexes where schemaname='public' and tablename in ('course_materials','student_question_flags','student_question_mistakes');
-- Sign in with separate teacher/student accounts for actual row-level tests.
-- Owner: drafts visible. Assigned student: published only. Other teacher/student: no rows.
-- list_my_hard_questions() always uses auth.uid(), never an arbitrary student parameter.
