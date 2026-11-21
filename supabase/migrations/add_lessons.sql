-- Run after add_assignment_feedback.sql and harden_homework.sql.
-- Additive and repeatable. No student results are deleted or rewritten.
begin;

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  section text not null default 'general' check (section in ('math','reading_writing','general')),
  topic text not null default '' check (char_length(topic)<=200),
  starts_at timestamptz,
  position integer not null check (position > 0),
  notes text not null default '' check (char_length(notes)<=5000),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists lessons_group_order_idx on public.lessons(group_id,position,id);
create index if not exists lessons_schedule_idx on public.lessons(starts_at) where starts_at is not null;
create table if not exists public.lesson_items (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  part text not null check (part in ('classwork','homework')),
  position integer not null check (position>0),
  question_id uuid references public.questions(id),
  title text check (char_length(title)<=200),
  body text check (char_length(body)<=5000),
  unique(lesson_id,part,position),
  check ((question_id is not null and title is null and body is null) or
    (question_id is null and (coalesce(char_length(btrim(title)),0)>0 or coalesce(char_length(btrim(body)),0)>0)))
);
create unique index if not exists lesson_items_question_idx on public.lesson_items(lesson_id,part,question_id) where question_id is not null;
alter table public.assignments add column if not exists lesson_id uuid references public.lessons(id);
alter table public.assignments add column if not exists lesson_part text;
alter table public.assignments add column if not exists lesson_request_id uuid;
alter table public.assignments alter column due_at drop not null;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.assignments'::regclass and conname='assignments_lesson_binding') then
    alter table public.assignments add constraint assignments_lesson_binding check
      ((lesson_id is null and lesson_part is null) or (lesson_id is not null and lesson_part in ('classwork','homework') and lesson_part is not null));
  end if;
end $$;
create index if not exists assignments_lesson_idx on public.assignments(lesson_id);
create unique index if not exists assignments_lesson_request_idx on public.assignments(lesson_request_id) where lesson_request_id is not null;

alter table public.lessons enable row level security;
alter table public.lesson_items enable row level security;
revoke all on public.lessons,public.lesson_items from public,anon,authenticated;
grant select,insert,delete on public.lessons to authenticated;
grant update(title,section,topic,starts_at,position,notes) on public.lessons to authenticated;
grant select,insert,update,delete on public.lesson_items to authenticated,service_role;
grant select,insert,update,delete on public.lessons to service_role;
grant update(lesson_id,lesson_part) on public.assignments to authenticated;

create or replace function public.can_read_lesson(p_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from lessons l where l.id=p_id and (public.can_manage_group(l.group_id)
    or (public.current_user_role()='student' and public.is_group_member(l.group_id))));
$$;
create or replace function public.can_manage_lesson(p_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from lessons l where l.id=p_id and public.can_manage_group(l.group_id));
$$;
revoke all on function public.can_read_lesson(uuid),public.can_manage_lesson(uuid) from public,anon;
grant execute on function public.can_read_lesson(uuid),public.can_manage_lesson(uuid) to authenticated,service_role;
drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons for select to authenticated using(public.can_read_lesson(id));
drop policy if exists lessons_insert on public.lessons;
create policy lessons_insert on public.lessons for insert to authenticated with check(created_by=auth.uid() and public.can_manage_group(group_id));
drop policy if exists lessons_update on public.lessons;
create policy lessons_update on public.lessons for update to authenticated using(public.can_manage_group(group_id)) with check(public.can_manage_group(group_id));
drop policy if exists lessons_delete on public.lessons;
create policy lessons_delete on public.lessons for delete to authenticated using(public.can_manage_group(group_id));
drop policy if exists lesson_items_read on public.lesson_items;
create policy lesson_items_read on public.lesson_items for select to authenticated using(public.can_read_lesson(lesson_id));
drop policy if exists lesson_items_write on public.lesson_items;
create policy lesson_items_write on public.lesson_items for all to authenticated using(public.can_manage_lesson(lesson_id)) with check(public.can_manage_lesson(lesson_id));

create or replace function public.guard_assignment_lesson()
returns trigger language plpgsql security definer set search_path=public as $$ begin
  if new.lesson_id is not null and (new.kind<>'question_set' or not exists(select 1 from lessons l where l.id=new.lesson_id and l.group_id=new.group_id)) then
    raise exception 'The lesson must belong to the assignment group' using errcode='22023';
  end if;
  if tg_op='UPDATE' and (new.lesson_id,new.lesson_part) is distinct from (old.lesson_id,old.lesson_part)
    and public.assignment_has_submissions(old.id) then
    raise exception 'Students have started: duplicate the assignment' using errcode='22023';
  end if;
  return new;
end $$;
drop trigger if exists guard_assignment_lesson on public.assignments;
create trigger guard_assignment_lesson before insert or update on public.assignments for each row execute function public.guard_assignment_lesson();
revoke all on function public.guard_assignment_lesson() from public,anon,authenticated;

create or replace function public.save_lesson(p_id uuid,p_group_id uuid,p_title text,p_section text,p_topic text,p_starts_at timestamptz,p_position integer,p_notes text,p_items jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare target uuid; item jsonb; n integer:=0;
begin
  perform 1 from groups where id=p_group_id for share;
  if auth.uid() is null or not public.can_manage_group(p_group_id) then raise exception 'Lesson unavailable' using errcode='42501'; end if;
  if p_id is null then
    insert into lessons(group_id,title,section,topic,starts_at,position,notes,created_by)
      values(p_group_id,btrim(p_title),p_section,p_topic,p_starts_at,p_position,p_notes,auth.uid()) returning id into target;
  else
    select id into target from lessons where id=p_id and group_id=p_group_id for update;
    if not found then raise exception 'Lesson unavailable' using errcode='42501'; end if;
    update lessons set title=btrim(p_title),section=p_section,topic=p_topic,starts_at=p_starts_at,position=p_position,notes=p_notes where id=target;
  end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>200 then raise exception 'Invalid lesson items' using errcode='22023'; end if;
  delete from lesson_items where lesson_id=target;
  for item in select value from jsonb_array_elements(p_items) loop
    n:=n+1;
    insert into lesson_items(lesson_id,part,position,question_id,title,body)
      values(target,item->>'part',n,(item->>'questionId')::uuid,item->>'title',item->>'body');
  end loop;
  return target;
end $$;
revoke all on function public.save_lesson(uuid,uuid,text,text,text,timestamptz,integer,text,jsonb) from public,anon;
grant execute on function public.save_lesson(uuid,uuid,text,text,text,timestamptz,integer,text,jsonb) to authenticated,service_role;

create or replace function public.list_my_lessons(p_group_id uuid default null,p_scheduled boolean default false)
returns table(id uuid,group_id uuid,title text,section text,topic text,starts_at timestamptz,"position" integer,notes text,created_by uuid,created_at timestamptz,group_name text,teacher_name text,member_count bigint)
language sql stable security definer set search_path=public as $$
  select l.*,g.name,coalesce(nullif(btrim(p.full_name),''),'Teacher'),(select count(*) from group_members gm where gm.group_id=g.id)
  from lessons l join groups g on g.id=l.group_id join profiles p on p.id=g.teacher_id
  where (p_group_id is null or l.group_id=p_group_id) and (not p_scheduled or l.starts_at is not null) and public.can_read_lesson(l.id)
  order by case when p_scheduled then l.starts_at end,g.name,l.group_id,l.position,l.id;
$$;
create or replace function public.list_my_lesson_assignments()
returns table(id uuid,lesson_id uuid,lesson_part text,title text,due_at timestamptz,status text,submitted_at timestamptz,correct_count integer,total_count integer)
language sql stable security definer set search_path=public as $$
  select a.id,a.lesson_id,a.lesson_part,a.title,a.due_at,s.status,s.submitted_at,s.correct_count,s.total_count
  from assignments a left join lateral (select sub.* from assignment_submissions sub where sub.assignment_id=a.id and sub.student_id=auth.uid() order by sub.attempt_no desc limit 1) s on true
  where a.published and a.lesson_id is not null and public.can_read_lesson(a.lesson_id)
  order by a.created_at,a.id;
$$;
revoke all on function public.list_my_lessons(uuid,boolean),public.list_my_lesson_assignments() from public,anon;
grant execute on function public.list_my_lessons(uuid,boolean),public.list_my_lesson_assignments() to authenticated,service_role;

-- Idempotency handles retries after a lost HTTP response. Questions are copied,
-- never linked dynamically: editing a lesson cannot change an issued assignment.
create or replace function public.assign_lesson_part(p_lesson uuid,p_part text,p_due_at timestamptz,p_comment text,p_request_id uuid)
returns table(id uuid,student_count integer) language plpgsql security definer set search_path=public as $$
declare l lessons%rowtype; a assignments%rowtype; ids uuid[]; content text; total integer; target uuid;
begin
  if auth.uid() is null or not public.can_manage_lesson(p_lesson) then raise exception 'Lesson unavailable' using errcode='42501'; end if;
  if p_request_id is null or p_part is null or p_part not in ('classwork','homework') or p_comment is null or char_length(p_comment)>5000 then raise exception 'Invalid assignment settings' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,7));
  select * into l from lessons where lessons.id=p_lesson for update;
  perform 1 from groups where groups.id=l.group_id for share;
  if not public.can_manage_group(l.group_id) then raise exception 'Lesson unavailable' using errcode='42501'; end if;
  select count(*)::integer into total from group_members where group_id=l.group_id;
  select * into a from assignments where lesson_request_id=p_request_id;
  if found then
    if a.created_by<>auth.uid() or a.lesson_id<>p_lesson or a.lesson_part<>p_part then raise exception 'Request already used' using errcode='22023'; end if;
    return query select a.id,total; return;
  end if;
  if exists(select 1 from groups where groups.id=l.group_id and archived) or total=0 then raise exception 'Choose an active group with students' using errcode='22023'; end if;
  select array_agg(question_id order by position) into ids from lesson_items where lesson_id=l.id and part=p_part and question_id is not null;
  if coalesce(cardinality(ids),0) not between 1 and 100 then raise exception 'Choose a part with 1 to 100 questions' using errcode='22023'; end if;
  select concat_ws(E'\n\n',nullif(string_agg(concat_ws(E'\n',title,body),E'\n\n' order by position),''),nullif(btrim(p_comment),'')) into content
    from lesson_items where lesson_id=l.id and part=p_part and question_id is null;
  if char_length(content)>5000 then raise exception 'The combined instructions exceed 5000 characters' using errcode='22023'; end if;
  insert into assignments(group_id,created_by,title,instructions,kind,due_at,lesson_id,lesson_part,lesson_request_id)
    values(l.group_id,auth.uid(),left(l.title,185)||case when p_part='homework' then ' · Homework' else ' · Classwork' end,content,'question_set',p_due_at,l.id,p_part,p_request_id) returning assignments.id into target;
  perform public.set_assignment_questions(target,ids);
  update assignments set published=true where assignments.id=target;
  return query select target,total;
end $$;
revoke all on function public.assign_lesson_part(uuid,text,timestamptz,text,uuid) from public,anon;
grant execute on function public.assign_lesson_part(uuid,text,timestamptz,text,uuid) to authenticated,service_role;

create or replace function public.duplicate_assignment(p_assignment uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare a assignments%rowtype; new_id uuid;
begin
  select * into a from assignments where id=p_assignment for share;
  if not found or not public.can_manage_assignment(p_assignment) then raise exception 'Assignment unavailable' using errcode='42501'; end if;
  if a.kind<>'question_set' then raise exception 'Past paper homework is temporarily unavailable' using errcode='22023'; end if;
  insert into assignments(group_id,created_by,title,instructions,kind,due_at,show_answers,max_attempts,time_limit_minutes,published,lesson_id,lesson_part)
    values(a.group_id,auth.uid(),left(a.title,190)||' (copy)',a.instructions,a.kind,a.due_at,a.show_answers,a.max_attempts,a.time_limit_minutes,false,a.lesson_id,a.lesson_part) returning id into new_id;
  insert into assignment_questions(assignment_id,question_id,position) select new_id,question_id,position from assignment_questions where assignment_id=a.id;
  return new_id;
end $$;
revoke all on function public.duplicate_assignment(uuid) from public,anon;
grant execute on function public.duplicate_assignment(uuid) to authenticated,service_role;

-- A missing due date is not an expired deadline. Retake embargoes remain active.
create or replace function public.question_in_pending_homework(p_user uuid,p_question uuid)
returns boolean language plpgsql volatile security definer set search_path=public as $$ begin
  perform public.expire_assignment_attempt(s.student_id,s.id) from assignment_submissions s join assignment_questions q on q.assignment_id=s.assignment_id
    where s.student_id=p_user and s.status='in_progress' and q.question_id=p_question;
  return exists(select 1 from assignments a join assignment_questions q on q.assignment_id=a.id
    join group_members gm on gm.group_id=a.group_id and gm.student_id=p_user where a.published and q.question_id=p_question and (
    not exists(select 1 from assignment_submissions s where s.assignment_id=a.id and s.student_id=p_user and s.status='submitted')
    or exists(select 1 from assignment_submissions s where s.assignment_id=a.id and s.student_id=p_user and s.status='in_progress')
    or ((a.due_at is null or now()<=a.due_at) and (select count(*) from assignment_submissions s where s.assignment_id=a.id and s.student_id=p_user)
      < a.max_attempts+(select count(*) from assignment_retake_grants r where r.assignment_id=a.id and r.student_id=p_user))));
end $$;
revoke all on function public.question_in_pending_homework(uuid,uuid) from public,anon,authenticated;
grant execute on function public.question_in_pending_homework(uuid,uuid) to service_role;
commit;
