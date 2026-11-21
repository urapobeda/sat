-- Run after harden_homework.sql. Additive; preserves guard_profile_role.
begin;
alter table profiles add column if not exists target_score integer;
alter table profiles add column if not exists sat_date date;
alter table profiles add column if not exists school text;
alter table profiles add column if not exists grade text;
alter table profiles add column if not exists telegram text;
alter table profiles add column if not exists about text;
alter table profiles add column if not exists avatar_url text;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.profiles'::regclass and conname='profile_target_range') then
 alter table profiles add constraint profile_target_range check(target_score between 400 and 1600) not valid;
 end if;
end $$;
create or replace function public.can_view_student(p_student uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select auth.uid()=p_student or public.current_user_role()='admin' or
 (public.current_user_role()='teacher' and exists(select 1 from group_members gm join groups g on g.id=gm.group_id
 where gm.student_id=p_student and g.teacher_id=auth.uid()
 and exists(select 1 from profiles p where p.id=p_student and p.role='student')));
$$;
revoke all on function public.can_view_student(uuid) from public,anon;
grant execute on function public.can_view_student(uuid) to authenticated,service_role;
-- SELECT only. Existing owner INSERT/UPDATE policies are not expanded.
do $$ declare t text; begin
 foreach t in array array['profiles','practice_sessions','practice_answers','test_sessions','test_answers','study_plans','exam_attempts'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('drop policy if exists staff_student_read on public.%I',t);
 execute format('create policy staff_student_read on public.%I for select to authenticated using (public.is_staff() and public.can_view_student(%I))',t,case when t='profiles' then 'id' else 'user_id' end);
 if t<>'test_answers' then execute format('grant select on public.%I to authenticated,service_role',t);
 else
   grant select on test_answers to service_role;
   revoke select on test_answers from authenticated;
   revoke select(correct_answer) on test_answers from authenticated;
   grant select(id,test_session_id,user_id,question_id,selected_answer,is_correct,created_at) on test_answers to authenticated;
 end if;
 end loop;
end $$;
-- Older security migrations installed RESTRICTIVE FOR ALL owner guards.
-- A new permissive SELECT policy cannot override them. Split their read and
-- write portions: owners keep exactly the same write checks; staff gain only
-- the scoped SELECT access requested above. No INSERT/UPDATE/DELETE expansion.
do $$ declare t text; g text; key text; owner_using text; owner_check text; begin
 foreach t in array array['profiles','practice_sessions','practice_answers','test_sessions','test_answers','study_plans','exam_attempts'] loop
 key:=case when t='profiles' then 'id' else 'user_id' end;
 foreach g in array array['audit_owner_guard','practice_owner_guard'] loop
 if exists(select 1 from pg_policy where polrelid=format('public.%I',t)::regclass and polname=g and polcmd='*') then
   select coalesce(pg_get_expr(polqual,polrelid),'true'),coalesce(pg_get_expr(polwithcheck,polrelid),pg_get_expr(polqual,polrelid),'true') into owner_using,owner_check
   from pg_policy where polrelid=format('public.%I',t)::regclass and polname=g;
   execute format('drop policy %I on public.%I',g,t);
   execute format('drop policy if exists %I on public.%I',g||'_insert',t);
   execute format('drop policy if exists %I on public.%I',g||'_update',t);
   execute format('drop policy if exists %I on public.%I',g||'_delete',t);
   execute format('create policy %I on public.%I as restrictive for insert to authenticated with check(%s)',g||'_insert',t,owner_check);
   execute format('create policy %I on public.%I as restrictive for update to authenticated using(%s) with check(%s)',g||'_update',t,owner_using,owner_check);
   execute format('create policy %I on public.%I as restrictive for delete to authenticated using(%s)',g||'_delete',t,owner_using);
   execute format('create policy %I on public.%I as restrictive for select to authenticated using((%s) or (public.is_staff() and public.can_view_student(%I)))',g,t,owner_using,key);
 end if;
 end loop;
 if t='test_sessions' and exists(select 1 from pg_policy where polrelid='public.test_sessions'::regclass and polname='test_sessions_history_owner_guard') then
   alter policy test_sessions_history_owner_guard on test_sessions using(auth.uid()=user_id or (public.is_staff() and public.can_view_student(user_id)));
 end if;
 end loop;
end $$;
-- Deletions of old student results remain subject to their original policies.
create table if not exists teacher_notes (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references profiles(id),
 author_id uuid not null references profiles(id),
 body text not null check(char_length(btrim(body)) between 1 and 5000),
 created_at timestamptz not null default now()
);
create index if not exists teacher_notes_student_idx on teacher_notes(student_id,created_at);
alter table teacher_notes enable row level security;
revoke all on teacher_notes from public,anon,authenticated;
grant select,insert on teacher_notes to authenticated;
grant select,insert,update,delete on teacher_notes to service_role;
drop policy if exists teacher_notes_read on teacher_notes;
create policy teacher_notes_read on teacher_notes for select to authenticated
 using(public.is_staff() and public.can_view_student(student_id) and (author_id=auth.uid() or public.current_user_role()='admin'));
drop policy if exists teacher_notes_write on teacher_notes;
create policy teacher_notes_write on teacher_notes for insert to authenticated
 with check(author_id=auth.uid() and public.is_staff() and public.can_view_student(student_id));
-- Returns basic group labels without giving students SELECT on other profiles.
create or replace function public.student_profile_groups(p_student uuid)
returns table(id uuid,name text,teacher_name text) language plpgsql stable security definer set search_path=public as $$
begin
 if not public.can_view_student(p_student) then raise exception 'Forbidden' using errcode='42501'; end if;
 return query select g.id,g.name,coalesce(p.full_name,'Teacher') from group_members gm join groups g on g.id=gm.group_id
 join profiles p on p.id=g.teacher_id where gm.student_id=p_student and
 (p_student=auth.uid() or g.teacher_id=auth.uid() or public.current_user_role()='admin');
end $$;
create or replace function public.teacher_student_ids()
returns table(student_id uuid) language plpgsql stable security definer set search_path=public as $$
begin
 if not public.is_staff() then raise exception 'Forbidden' using errcode='42501'; end if;
 return query select p.id from profiles p where p.role='student' and public.can_view_student(p.id) order by p.id;
end $$;
revoke all on function public.student_profile_groups(uuid),public.teacher_student_ids() from public,anon;
grant execute on function public.student_profile_groups(uuid),public.teacher_student_ids() to authenticated,service_role;
create or replace function public.search_teacher_students(p_query text)
returns table(student_id uuid) language plpgsql stable security definer set search_path=public as $$
begin
 if not public.is_staff() then raise exception 'Forbidden' using errcode='42501'; end if;
 return query select p.id from profiles p where p.role='student' and public.can_view_student(p.id)
 and (coalesce(p.full_name,'') ilike '%'||left(p_query,200)||'%' or exists(select 1 from group_members m join groups g on g.id=m.group_id
 where m.student_id=p.id and (g.teacher_id=auth.uid() or public.current_user_role()='admin') and g.name ilike '%'||left(p_query,200)||'%')) order by p.full_name,p.id;
end $$;
revoke all on function public.search_teacher_students(text) from public,anon;
grant execute on function public.search_teacher_students(text) to authenticated,service_role;

-- Private image bucket: uploads and signed reads obey the same student boundary.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',false,2097152,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select to authenticated using(bucket_id='avatars'
 and exists(select 1 from profiles p where p.id::text=(storage.foldername(name))[1] and public.can_view_student(p.id)));
drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects for update to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text)
 with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
-- An unrelated legacy Storage policy must not bypass the avatar boundary.
drop policy if exists avatars_insert_guard on storage.objects;
create policy avatars_insert_guard on storage.objects as restrictive for insert to authenticated
 with check(bucket_id<>'avatars' or (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists avatars_update_guard on storage.objects;
create policy avatars_update_guard on storage.objects as restrictive for update to authenticated
 using(bucket_id<>'avatars' or (storage.foldername(name))[1]=auth.uid()::text)
 with check(bucket_id<>'avatars' or (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists avatars_delete_guard on storage.objects;
create policy avatars_delete_guard on storage.objects as restrictive for delete to authenticated
 using(bucket_id<>'avatars' or (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists avatars_read_guard on storage.objects;
create policy avatars_read_guard on storage.objects as restrictive for select to authenticated
 using(bucket_id<>'avatars' or exists(select 1 from profiles p where p.id::text=(storage.foldername(name))[1] and public.can_view_student(p.id)));
notify pgrst,'reload schema';
commit;
