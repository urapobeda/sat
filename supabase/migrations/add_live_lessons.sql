-- Apply after add_lessons.sql. Additive; no existing results are modified.
begin;
do $$ begin
  if to_regclass('public.lesson_items') is null then raise exception 'Apply add_lessons.sql first'; end if;
end $$;
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id),
  group_id uuid not null references public.groups(id),
  status text not null default 'active' check(status in ('active','finished')),
  current_position integer not null default 1 check(current_position>0),
  join_code text not null unique check(join_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$'),
  question_ids uuid[] not null check(cardinality(question_ids) between 1 and 100),
  revealed_positions integer[] not null default '{}',
  started_at timestamptz not null default now(), finished_at timestamptz,
  check(current_position<=cardinality(question_ids)),
  check((status='active' and finished_at is null) or (status='finished' and finished_at is not null))
);
create unique index if not exists live_one_active_lesson_idx on public.live_sessions(lesson_id) where status='active';
create index if not exists live_group_idx on public.live_sessions(group_id,status);
-- Private roster snapshot: students never receive other students' names or answers.
create table if not exists public.live_session_roster (
  session_id uuid not null references public.live_sessions(id),
  student_id uuid not null references public.profiles(id),
  full_name text not null,
  primary key(session_id,student_id)
);
create table if not exists public.live_answers (
  session_id uuid not null references public.live_sessions(id),
  question_id uuid not null references public.questions(id),
  student_id uuid not null references public.profiles(id),
  choice text not null check(char_length(btrim(choice)) between 1 and 200),
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  primary key(session_id,question_id,student_id),
  foreign key(session_id,student_id) references public.live_session_roster(session_id,student_id)
);
alter table public.live_sessions enable row level security;
alter table public.live_answers enable row level security;
alter table public.live_session_roster enable row level security;
revoke all on public.live_sessions,public.live_answers,public.live_session_roster from public,anon,authenticated;
grant select on public.live_sessions,public.live_answers,public.live_session_roster to authenticated;
grant select,insert,update,delete on public.live_sessions,public.live_answers,public.live_session_roster to service_role;

create or replace function public.can_read_live_session(p_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from live_sessions s where s.id=p_id and (can_manage_group(s.group_id) or
    (current_user_role()='student' and is_group_member(s.group_id) and exists(
      select 1 from live_session_roster r where r.session_id=s.id and r.student_id=auth.uid()))));
$$;
revoke all on function public.can_read_live_session(uuid) from public,anon;
grant execute on function public.can_read_live_session(uuid) to authenticated,service_role;
drop policy if exists live_sessions_read on public.live_sessions;
create policy live_sessions_read on public.live_sessions for select to authenticated using(can_read_live_session(id));
drop policy if exists live_answers_staff_read on public.live_answers;
create policy live_answers_staff_read on public.live_answers for select to authenticated using(exists(
  select 1 from live_sessions s where s.id=session_id and can_manage_group(s.group_id)));
drop policy if exists live_roster_staff_read on public.live_session_roster;
create policy live_roster_staff_read on public.live_session_roster for select to authenticated using(exists(
  select 1 from live_sessions s where s.id=session_id and can_manage_group(s.group_id)));

create or replace function public.start_live_lesson(p_lesson uuid)
returns text language plpgsql security definer set search_path=public as $$
declare l lessons; target uuid; code text; ids uuid[]; attempt integer;
begin
  select * into l from lessons where id=p_lesson for update;
  if not found or auth.uid() is null or not can_manage_group(l.group_id) then raise exception 'Lesson unavailable' using errcode='42501'; end if;
  select join_code into code from live_sessions where lesson_id=p_lesson and status='active';
  if found then return code; end if;
  if exists(select 1 from groups where id=l.group_id and archived) then raise exception 'Group is archived' using errcode='22023'; end if;
  select array_agg(question_id order by position,id) into ids from lesson_items where lesson_id=p_lesson and part='classwork' and question_id is not null;
  if coalesce(cardinality(ids),0) not between 1 and 100 then raise exception 'Add 1 to 100 classwork questions' using errcode='22023'; end if;
  if exists(select 1 from unnest(ids) q where not exists(select 1 from question_solutions k where k.question_id=q and nullif(btrim(k.correct_answer),'') is not null)) then
    raise exception 'Some classwork questions have no answer key' using errcode='22023';
  end if;
  if not exists(select 1 from group_members where group_id=l.group_id) then raise exception 'Group has no students' using errcode='22023'; end if;
  for attempt in 1..12 loop
    code:=translate(upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),'01','JK');
    begin
      insert into live_sessions(lesson_id,group_id,question_ids,join_code) values(p_lesson,l.group_id,ids,code) returning id into target;
      exit;
    exception when unique_violation then if attempt=12 then raise; end if;
    end;
  end loop;
  insert into live_session_roster(session_id,student_id,full_name)
    select target,m.student_id,coalesce(nullif(btrim(p.full_name),''),'Student') from group_members m join profiles p on p.id=m.student_id where m.group_id=l.group_id;
  return code;
end $$;
create or replace function public.control_live_lesson(p_code text,p_action text,p_position integer)
returns void language plpgsql security definer set search_path=public as $$
declare s live_sessions;
begin
  select * into s from live_sessions where join_code=upper(btrim(p_code)) for update;
  if not found or auth.uid() is null or not can_manage_group(s.group_id) then raise exception 'Session unavailable' using errcode='42501'; end if;
  if p_action not in ('next','reveal','finish') or p_action is null then raise exception 'Invalid action' using errcode='22023'; end if;
  if s.status='finished' then
    if p_action='finish' then return; end if;
    raise exception 'Session has finished' using errcode='40001';
  end if;
  if p_position is distinct from s.current_position then raise exception 'Question has changed' using errcode='40001'; end if;
  if p_action='finish' then update live_sessions set status='finished',finished_at=now() where id=s.id;
  elsif p_action='reveal' then
    update live_sessions set revealed_positions=array_append(revealed_positions,s.current_position) where id=s.id and not (s.current_position=any(revealed_positions));
  else
    if s.current_position>=cardinality(s.question_ids) then raise exception 'This is the last question' using errcode='22023'; end if;
    update live_sessions set current_position=current_position+1 where id=s.id;
  end if;
end $$;

-- Only the trusted answer route may supply a verdict. The browser has no EXECUTE.
create or replace function public.submit_verified_live_answer(p_student uuid,p_session uuid,p_question uuid,p_choice text,p_correct boolean)
returns void language plpgsql security definer set search_path=public as $$
declare s live_sessions;
begin
  select * into s from live_sessions where id=p_session for update;
  if not found or not exists(select 1 from profiles where id=p_student and role='student') or not exists(
    select 1 from live_session_roster r join group_members m on m.student_id=r.student_id and m.group_id=s.group_id where r.session_id=s.id and r.student_id=p_student)
    then raise exception 'Session unavailable' using errcode='42501'; end if;
  if s.status<>'active' or s.question_ids[s.current_position] is distinct from p_question or s.current_position=any(s.revealed_positions) then
    raise exception 'Question is closed' using errcode='40001';
  end if;
  insert into live_answers(session_id,question_id,student_id,choice,is_correct) values(s.id,p_question,p_student,btrim(p_choice),p_correct)
    on conflict(session_id,question_id,student_id) do nothing;
end $$;

create or replace function public.get_live_snapshot(p_code text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare s live_sessions; staff boolean; own jsonb; result jsonb;
begin
  select * into s from live_sessions where join_code=upper(btrim(p_code));
  if not found or auth.uid() is null or not can_read_live_session(s.id) then raise exception 'Session unavailable' using errcode='42501'; end if;
  staff:=can_manage_group(s.group_id);
  select jsonb_build_object('question_id',a.question_id,'choice',a.choice,'is_correct',case when s.current_position=any(s.revealed_positions) then a.is_correct else null end)
    into own from live_answers a where a.session_id=s.id and a.student_id=auth.uid() and a.question_id=s.question_ids[s.current_position];
  result:=jsonb_build_object('session',to_jsonb(s),'lesson_title',(select title from lessons where id=s.lesson_id),
    'staff',staff,'own_answer',own,'own_correct',case when s.status='finished' then (select count(*) from live_answers a where a.session_id=s.id and a.student_id=auth.uid() and a.is_correct) else null end);
  if staff then
    result:=result||jsonb_build_object('roster',coalesce((select jsonb_agg(to_jsonb(r) order by r.full_name,r.student_id) from live_session_roster r where r.session_id=s.id),'[]'::jsonb),
      'answers',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at,a.student_id) from live_answers a where a.session_id=s.id),'[]'::jsonb));
  end if;
  return result;
end $$;
create or replace function public.list_my_live_sessions(p_lesson uuid default null,p_active boolean default true)
returns setof public.live_sessions language sql stable security invoker set search_path=public as $$
  select s.* from live_sessions s where (p_lesson is null or s.lesson_id=p_lesson) and (not p_active or s.status='active') order by s.started_at desc,s.id;
$$;
create or replace function public.question_in_active_live(p_student uuid,p_question uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from live_sessions s join live_session_roster r on r.session_id=s.id join group_members m on m.group_id=s.group_id and m.student_id=r.student_id
    where s.status='active' and r.student_id=p_student and p_question=any(s.question_ids));
$$;
revoke all on function public.start_live_lesson(uuid),public.control_live_lesson(text,text,integer),public.get_live_snapshot(text),public.list_my_live_sessions(uuid,boolean) from public,anon;
grant execute on function public.start_live_lesson(uuid),public.control_live_lesson(text,text,integer),public.get_live_snapshot(text),public.list_my_live_sessions(uuid,boolean) to authenticated,service_role;
revoke all on function public.submit_verified_live_answer(uuid,uuid,uuid,text,boolean),public.question_in_active_live(uuid,uuid) from public,anon,authenticated;
grant execute on function public.submit_verified_live_answer(uuid,uuid,uuid,text,boolean),public.question_in_active_live(uuid,uuid) to service_role;

-- No DELETE events are used: session/answer history is immutable from the browser.
do $$ begin
  if not exists(select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='live_sessions') then alter publication supabase_realtime add table public.live_sessions; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='live_answers') then alter publication supabase_realtime add table public.live_answers; end if;
end $$;
notify pgrst,'reload schema';
commit;
