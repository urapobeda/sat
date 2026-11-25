-- Read-only checks AFTER both new migrations. No student records are changed.
select has_function_privilege('authenticated','public.assignment_has_submissions(uuid)','EXECUTE') as must_be_false,
       has_function_privilege('authenticated','public.duplicate_assignment(uuid)','EXECUTE') as must_be_true,
       has_function_privilege('authenticated','public.save_verified_assignment_answer(uuid,uuid,uuid,text,boolean,integer)','EXECUTE') as must_be_false,
       has_function_privilege('service_role','public.save_verified_assignment_answer(uuid,uuid,uuid,text,boolean,integer)','EXECUTE') as must_be_true;
select has_column_privilege('authenticated','public.test_answers','correct_answer','SELECT') as must_be_false,
       has_any_column_privilege('authenticated','public.question_solutions','SELECT') as must_be_false;
select has_table_privilege('authenticated','public.teacher_notes','SELECT') as must_be_true,
       has_table_privilege('authenticated','public.teacher_notes','INSERT') as must_be_true,
       has_table_privilege('authenticated','public.teacher_notes','UPDATE') as must_be_false,
       (select bool_and(has_table_privilege('service_role','public.teacher_notes',privilege)) from unnest(array['SELECT','INSERT','UPDATE','DELETE']) privilege) as must_be_true;
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('profiles','teacher_notes','practice_sessions','practice_answers','test_sessions','test_answers','study_plans','exam_attempts','assignment_submissions','assignment_answers');
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='avatars';
-- Expect private bucket, 2097152 bytes, JPEG/PNG/WebP/GIF only.
select tablename,policyname,permissive,cmd,qual,with_check from pg_policies
where (schemaname='public' and (policyname like 'staff_student%' or policyname like 'audit_owner%' or policyname like 'practice_owner_guard%' or tablename='teacher_notes'))
or (schemaname='storage' and policyname like 'avatars_%') order by tablename,policyname;
select tgname from pg_trigger where tgrelid='public.profiles'::regclass and tgname='guard_profile_role';
