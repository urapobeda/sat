-- Apply after add_lessons.sql, add_vocabulary.sql and add_live_lessons.sql.
-- Additive and repeatable. No student results are deleted or overwritten.
begin;
do $$ begin
  if to_regclass('public.live_sessions') is null or to_regclass('public.practice_answers') is null or to_regclass('public.test_answers') is null
    or to_regprocedure('public.assignment_answers_released(uuid,uuid)') is null
    or to_regprocedure('public.can_manage_vocabulary(uuid,uuid)') is null
    or to_regprocedure('public.validate_vocabulary_lesson()') is null then
    raise exception 'Apply the core schema, lesson, vocabulary and live-lesson migrations first';
  end if;
end $$;
create table if not exists public.course_materials (
  id uuid primary key default gen_random_uuid(), group_id uuid references public.groups(id), lesson_id uuid references public.lessons(id) on delete set null,
  created_by uuid not null default auth.uid() references public.profiles(id),
  kind text not null check(kind in ('text','note','link')), title text not null check(char_length(btrim(title)) between 1 and 200),
  section text not null default 'general' check(section in ('math','reading_writing','general')),
  body text not null default '' check(char_length(body)<=100000), url text not null default '' check(char_length(url)<=2048),
  position integer not null default 1 check(position between 1 and 100000), published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check((kind='link' and url ~* '^https?://[^/@?#[:space:]]+([/?#][^[:space:]]*)?$') or (kind<>'link' and url='' and char_length(btrim(body))>0))
);
create index if not exists materials_group_idx on public.course_materials(group_id,published,position,id);
create index if not exists materials_author_idx on public.course_materials(created_by);
create index if not exists materials_lesson_idx on public.course_materials(lesson_id);
alter table public.course_materials enable row level security;
revoke all on public.course_materials from public,anon,authenticated;
grant select,insert,delete on public.course_materials to authenticated;
grant update(group_id,lesson_id,kind,title,section,body,url,position,published) on public.course_materials to authenticated;
grant select,insert,update,delete on public.course_materials to service_role;
-- Reuse the vocabulary scope helpers: common means the author's groups, never public.
drop policy if exists materials_read on public.course_materials;
create policy materials_read on public.course_materials for select to authenticated using(
  can_manage_vocabulary(group_id,created_by) or (published and can_read_vocabulary(group_id,created_by)));
drop policy if exists materials_create on public.course_materials;
create policy materials_create on public.course_materials for insert to authenticated with check(created_by=auth.uid() and can_manage_vocabulary(group_id,created_by));
drop policy if exists materials_update on public.course_materials;
create policy materials_update on public.course_materials for update to authenticated using(can_manage_vocabulary(group_id,created_by)) with check(can_manage_vocabulary(group_id,created_by));
drop policy if exists materials_delete on public.course_materials;
create policy materials_delete on public.course_materials for delete to authenticated using(can_manage_vocabulary(group_id,created_by));
-- Same binding/immutable author contract as vocabulary; the function uses shared columns only.
drop trigger if exists validate_material_lesson on public.course_materials;
create trigger validate_material_lesson before insert or update on public.course_materials for each row execute function public.validate_vocabulary_lesson();
create or replace function public.list_course_materials()
returns table(id uuid,group_id uuid,lesson_id uuid,created_by uuid,kind text,title text,section text,url text,"position" integer,published boolean,created_at timestamptz,updated_at timestamptz,group_name text,lesson_title text)
language sql stable security invoker set search_path=public as $$
  select m.id,m.group_id,m.lesson_id,m.created_by,m.kind,m.title,m.section,m.url,m.position,m.published,m.created_at,m.updated_at,g.name,l.title
  from course_materials m left join groups g on g.id=m.group_id left join lessons l on l.id=m.lesson_id order by m.position,m.id;
$$;
revoke all on function public.list_course_materials() from public,anon;
grant execute on function public.list_course_materials() to authenticated,service_role;

create table if not exists public.student_question_flags (
  student_id uuid not null references public.profiles(id), question_id uuid not null references public.questions(id),
  created_at timestamptz not null default now(), primary key(student_id,question_id)
);
alter table public.student_question_flags enable row level security;
revoke all on public.student_question_flags from public,anon,authenticated;
grant select,insert,delete on public.student_question_flags to authenticated;
grant select,insert,update,delete on public.student_question_flags to service_role;
drop policy if exists question_flags_own on public.student_question_flags;
create policy question_flags_own on public.student_question_flags for all to authenticated using(student_id=auth.uid()) with check(student_id=auth.uid());

-- Preserve a wrong attempt even if its answer is later corrected. Network retries and
-- edits within the same attempt count once. The ledger is never readable by the browser.
create table if not exists public.student_question_mistakes (
  student_id uuid not null references public.profiles(id), question_id uuid not null references public.questions(id),
  source text not null check(source in ('practice','test','homework','live')), attempt_id uuid not null,
  created_at timestamptz not null default now(), primary key(student_id,question_id,source,attempt_id)
);
alter table public.student_question_mistakes enable row level security;
revoke all on public.student_question_mistakes from public,anon,authenticated;
grant select,insert,update,delete on public.student_question_mistakes to service_role;
create or replace function public.capture_question_mistake()
returns trigger language plpgsql security definer set search_path=public as $$
declare student uuid; attempt uuid; origin text;
begin
  if new.is_correct is distinct from false then return new; end if;
  if tg_table_name='practice_answers' then student:=new.user_id; attempt:=new.session_id; origin:='practice';
  elsif tg_table_name='test_answers' then student:=new.user_id; attempt:=new.test_session_id; origin:='test';
  elsif tg_table_name='assignment_answers' then select student_id into student from assignment_submissions where id=new.submission_id; attempt:=new.submission_id; origin:='homework';
  else student:=new.student_id; attempt:=new.session_id; origin:='live'; end if;
  if student is not null and exists(select 1 from profiles where id=student) then insert into student_question_mistakes(student_id,question_id,source,attempt_id) values(student,new.question_id,origin,attempt) on conflict do nothing; end if;
  return new;
end $$;
revoke all on function public.capture_question_mistake() from public,anon,authenticated;
drop trigger if exists capture_question_mistake on public.practice_answers;
create trigger capture_question_mistake after insert or update on public.practice_answers for each row execute function public.capture_question_mistake();
drop trigger if exists capture_question_mistake on public.test_answers;
create trigger capture_question_mistake after insert or update on public.test_answers for each row execute function public.capture_question_mistake();
drop trigger if exists capture_question_mistake on public.assignment_answers;
create trigger capture_question_mistake after insert or update on public.assignment_answers for each row execute function public.capture_question_mistake();
drop trigger if exists capture_question_mistake on public.live_answers;
create trigger capture_question_mistake after insert or update on public.live_answers for each row execute function public.capture_question_mistake();
with prior as (
  select user_id,question_id,'practice',session_id from practice_answers where is_correct=false
  union select user_id,question_id,'test',test_session_id from test_answers where is_correct=false
  union select s.student_id,a.question_id,'homework',a.submission_id from assignment_answers a join assignment_submissions s on s.id=a.submission_id where a.is_correct=false
  union select student_id,question_id,'live',session_id from live_answers where is_correct=false
)
insert into public.student_question_mistakes(student_id,question_id,source,attempt_id)
  select r.* from prior r join profiles p on p.id=r.user_id on conflict do nothing;
create or replace function public.my_hard_question_signals(p_question uuid default null)
returns table(question_id uuid,marked boolean,mistake_count integer)
language sql stable security definer set search_path=public as $$
  with released as (
    select m.question_id from student_question_mistakes m where m.student_id=auth.uid() and (p_question is null or m.question_id=p_question) and (
      m.source='practice' or
      (m.source='test' and exists(select 1 from test_sessions s where s.id=m.attempt_id and s.user_id=auth.uid() and s.completed_at is not null)) or
      (m.source='homework' and exists(select 1 from assignment_submissions s where s.id=m.attempt_id and s.student_id=auth.uid() and s.status='submitted' and assignment_answers_released(s.assignment_id,auth.uid()))) or
      (m.source='live' and exists(select 1 from live_sessions s where s.id=m.attempt_id and array_position(s.question_ids,m.question_id)=any(s.revealed_positions)))
    )
  ), counts as (select r.question_id,count(*)::integer as n from released r group by r.question_id)
  select coalesce(c.question_id,f.question_id),(f.question_id is not null),coalesce(c.n,0)
  from counts c full join (select * from student_question_flags where student_id=auth.uid() and (p_question is null or question_id=p_question)) f on f.question_id=c.question_id
  where auth.uid() is not null and (f.question_id is not null or c.n>=2);
$$;
create or replace function public.list_my_hard_questions(p_question uuid default null)
returns table(question_id uuid,marked boolean,mistake_count integer,section text,topic text,difficulty text,preview text)
language sql stable security invoker set search_path=public as $$
  select q.id,h.marked,h.mistake_count,q.section,q.topic,q.difficulty,left(q.question,200) from questions q join my_hard_question_signals(p_question) h on h.question_id=q.id order by h.mistake_count desc,q.id;
$$;
revoke all on function public.list_my_hard_questions(uuid),public.my_hard_question_signals(uuid) from public,anon;
grant execute on function public.list_my_hard_questions(uuid),public.my_hard_question_signals(uuid) to authenticated,service_role;
notify pgrst,'reload schema';
commit;
