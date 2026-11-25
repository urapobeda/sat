-- Read-only verification. Run in SQL Editor AFTER add_lessons.sql.
-- Prerequisites: the existing roles/groups/assignments/feedback migrations,
-- then harden_homework.sql. On an existing working project run ONLY the new
-- add_lessons.sql; rerunning old migrations can restore old policies/functions.
-- add_lessons.sql is transactional and safe to repeat. It does not rewrite results.
-- Keep the migration and all student records if the feature needs to be disabled.
-- Hide the new course/lesson UI while investigating; keep null-deadline handling.
-- Do not DROP lesson tables, reset the database, or restore due_at NOT NULL while
-- no-deadline assignments exist. Use a separate reviewed corrective migration.

select tablename, rowsecurity from pg_tables
where schemaname='public' and tablename in ('lessons','lesson_items');
-- Expected: both rowsecurity values true.

select column_name,is_nullable from information_schema.columns
where table_schema='public' and table_name='assignments'
and column_name in ('lesson_id','lesson_part','lesson_request_id','due_at');
-- Expected: all four columns nullable.

select role_name,
  has_table_privilege(role_name,'public.lessons','select') as read_lessons,
  has_table_privilege(role_name,'public.lesson_items','select') as read_items,
  has_function_privilege(role_name,'public.assign_lesson_part(uuid,text,timestamptz,text,uuid)','execute') as call_assign
from (values ('anon'),('authenticated'),('service_role')) roles(role_name);
-- Expected: anon false/false/false; authenticated and service_role true/true/true.
-- authenticated EXECUTE is protected by the database role/group checks inside RPCs.

select has_column_privilege('authenticated','public.lessons','title','update') as edit_title,
  has_column_privilege('authenticated','public.lessons','group_id','update') as move_group,
  has_column_privilege('authenticated','public.lessons','created_by','update') as change_author;
-- Expected: true, false, false. Actual row access is additionally restricted by RLS.

select tablename,policyname,cmd,roles from pg_policies
where schemaname='public' and tablename in ('lessons','lesson_items')
order by tablename,policyname;

select (select count(*) from public.lessons) as lessons,
  (select count(*) from public.lesson_items) as items,
  (select count(*) from public.assignments where lesson_id is not null) as lesson_assignments;
-- Zero counts before the first lesson are normal, not an import failure.

-- Manual smoke test with two independent student/teacher accounts:
-- 1. Teacher: Groups -> group -> Create lesson; add both parts; save and reload.
-- 2. Assign homework: exercise all deadline presets and No due date; inspect toast.
-- 3. Student: Course plan -> Start -> submit; reload to confirm the updated status.
-- 4. Both Schedule pages: correct Almaty dates, month navigation, group filter.
-- 5. Change the lesson's questions: existing homework must retain its snapshot.
-- 6. The second group's teacher/student must not see or edit the first group's lessons.
