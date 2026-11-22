-- Read-only verification after add_vocabulary.sql. Never use real student tokens in logs.
select relname,relrowsecurity from pg_class where oid='public.vocabulary_words'::regclass;
select policyname,cmd,qual,with_check from pg_policies where schemaname='public' and tablename='vocabulary_words';
select indexname,indexdef from pg_indexes where schemaname='public' and tablename='vocabulary_words';
select has_table_privilege('authenticated','public.vocabulary_words','SELECT') as students_read,
       has_column_privilege('authenticated','public.vocabulary_words','created_by','UPDATE') as author_update_must_be_false,
       has_table_privilege('service_role','public.vocabulary_words','SELECT') as service_read,
       has_function_privilege('anon','public.list_vocabulary_words()','EXECUTE') as anonymous_execute_must_be_false;
-- Manual checks with two teachers and their students:
-- Teacher A adds a common word and a group word; only A's students see them.
-- Teacher B cannot update/delete A's words. Students cannot insert/update/delete.
-- A repeated case-insensitive import skips existing entries without overwriting.
-- Application rollback: revert vocabulary code and leave these additive objects in place.
-- Do not drop the table to roll back: that would delete the teacher's vocabulary.
