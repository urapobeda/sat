-- Read-only inventory. Run as a DB administrator before and after the approved rollout.
begin read only;

with required(name) as (
  values ('profiles'), ('questions'), ('question_solutions'), ('question_marks'),
    ('practice_sessions'), ('practice_answers'), ('test_sessions'), ('test_answers'),
    ('study_plans'), ('exam_papers'), ('exam_modules'), ('exam_module_questions'),
    ('exam_attempts'), ('exam_attempt_answers'), ('paper_bookmarks')
)
select required.name, c.oid is not null as present, c.relrowsecurity as rls,
       r.rolname as role,
       has_any_column_privilege(r.oid, c.oid, 'SELECT') as can_read,
       has_any_column_privilege(r.oid, c.oid, 'INSERT') as can_insert,
       has_any_column_privilege(r.oid, c.oid, 'UPDATE') as can_update,
       has_table_privilege(r.oid, c.oid, 'DELETE') as can_delete
from required
left join pg_class c on c.oid = to_regclass(format('public.%I', required.name))
cross join pg_roles r
where r.rolname in ('anon', 'authenticated', 'service_role')
order by required.name, r.rolname;

select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;

select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema = 'public'
order by table_name, ordinal_position;

select tablename, indexname, indexdef
from pg_indexes where schemaname = 'public' order by tablename, indexname;

select c.relname as table_name, k.conname, pg_get_constraintdef(k.oid) as definition
from pg_constraint k join pg_class c on c.oid = k.conrelid
where c.relnamespace = 'public'::regnamespace order by c.relname, k.conname;

select table_name, column_name,
  has_column_privilege('anon', format('public.%I', table_name), column_name, 'SELECT') as anon_read,
  has_column_privilege('authenticated', format('public.%I', table_name), column_name, 'SELECT') as student_read
from information_schema.columns where table_schema = 'public'
  and (table_name = 'question_solutions' or
    (table_name = 'questions' and column_name in ('correct_answer', 'explanation')));

select to_regprocedure('public.finalize_verified_test(uuid,uuid,jsonb,integer,integer,integer,integer)') as finalizer;
rollback;
