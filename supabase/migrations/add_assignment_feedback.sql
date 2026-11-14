-- Run after add_assignments.sql. Preserves all existing attempts and answers.
begin;
create table if not exists public.assignment_feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.assignment_submissions(id),
  question_id uuid references public.questions(id),
  author_id uuid not null references public.profiles(id),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists assignment_feedback_submission_idx on public.assignment_feedback(submission_id, created_at);
create table if not exists public.assignment_retake_grants (
  submission_id uuid primary key references public.assignment_submissions(id),
  assignment_id uuid not null references public.assignments(id),
  student_id uuid not null references public.profiles(id),
  granted_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists assignment_retake_student_idx on public.assignment_retake_grants(assignment_id, student_id);
alter table public.assignment_feedback enable row level security;
alter table public.assignment_retake_grants enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.assignment_answers enable row level security;
revoke all on public.assignment_feedback, public.assignment_retake_grants from public, anon, authenticated;
grant select, insert on public.assignment_feedback to authenticated;
grant select on public.assignment_retake_grants, public.assignment_submissions, public.assignment_answers to authenticated;
grant select, insert, update, delete on public.assignment_feedback, public.assignment_retake_grants to service_role;

create or replace function public.can_manage_submission(p_submission uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.assignment_submissions s where s.id=p_submission and public.can_manage_assignment(s.assignment_id)); $$;
create or replace function public.can_read_submission_feedback(p_submission uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.can_manage_submission(p_submission) or exists(select 1 from public.assignment_submissions s
  where s.id=p_submission and s.student_id=auth.uid() and s.status='submitted'); $$;
create or replace function public.can_write_submission_feedback(p_submission uuid, p_question uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.assignment_submissions s where s.id=p_submission and s.status='submitted'
  and public.can_manage_assignment(s.assignment_id) and (p_question is null or exists(
    select 1 from public.assignment_questions q where q.assignment_id=s.assignment_id and q.question_id=p_question))); $$;
create or replace function public.can_read_assignment_answers(p_submission uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.can_manage_submission(p_submission) or exists(
  select 1 from public.assignment_submissions s join public.assignments a on a.id=s.assignment_id
  where s.id=p_submission and s.student_id=auth.uid() and s.status='submitted'
  and (a.show_answers='after_submit' or (a.show_answers='after_due' and now()>a.due_at))); $$;

drop policy if exists assignment_submissions_read on public.assignment_submissions;
create policy assignment_submissions_read on public.assignment_submissions for select to authenticated
using (student_id=auth.uid() or public.can_manage_assignment(assignment_id));
drop policy if exists assignment_submissions_read_guard on public.assignment_submissions;
create policy assignment_submissions_read_guard on public.assignment_submissions as restrictive for select to authenticated
using (student_id=auth.uid() or public.can_manage_assignment(assignment_id));
drop policy if exists assignment_answers_read on public.assignment_answers;
create policy assignment_answers_read on public.assignment_answers for select to authenticated using(public.can_read_assignment_answers(submission_id));
drop policy if exists assignment_answers_read_guard on public.assignment_answers;
create policy assignment_answers_read_guard on public.assignment_answers as restrictive for select to authenticated using(public.can_read_assignment_answers(submission_id));
drop policy if exists assignment_feedback_read on public.assignment_feedback;
create policy assignment_feedback_read on public.assignment_feedback for select to authenticated using(public.can_read_submission_feedback(submission_id));
drop policy if exists assignment_feedback_read_guard on public.assignment_feedback;
create policy assignment_feedback_read_guard on public.assignment_feedback as restrictive for select to authenticated using(public.can_read_submission_feedback(submission_id));
drop policy if exists assignment_feedback_insert on public.assignment_feedback;
create policy assignment_feedback_insert on public.assignment_feedback for insert to authenticated
with check(author_id=auth.uid() and public.can_write_submission_feedback(submission_id,question_id));
drop policy if exists assignment_feedback_insert_guard on public.assignment_feedback;
create policy assignment_feedback_insert_guard on public.assignment_feedback as restrictive for insert to authenticated
with check(author_id=auth.uid() and public.can_write_submission_feedback(submission_id,question_id));
drop policy if exists assignment_retake_read on public.assignment_retake_grants;
create policy assignment_retake_read on public.assignment_retake_grants for select to authenticated
using(student_id=auth.uid() or public.can_manage_assignment(assignment_id));

-- One extra attempt per completed submission. Retries and concurrent clicks are
-- idempotent; the same advisory lock as start_assignment_attempt prevents races.
create or replace function public.grant_assignment_retake(p_submission uuid)
returns integer language plpgsql security definer set search_path = public
as $$
declare s public.assignment_submissions%rowtype; result integer;
begin
  select * into s from public.assignment_submissions where id=p_submission;
  if not found or not public.can_manage_assignment(s.assignment_id) then raise exception 'Submission unavailable' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(s.student_id::text||s.assignment_id::text,2));
  if s.status<>'submitted' then raise exception 'Submit the attempt first' using errcode='22023'; end if;
  if exists(select 1 from public.assignment_retake_grants r where r.submission_id=s.id) then
    select count(*)::int into result from public.assignment_retake_grants r where r.assignment_id=s.assignment_id and r.student_id=s.student_id;
    return result;
  end if;
  if exists(select 1 from public.assignment_submissions n where n.assignment_id=s.assignment_id and n.student_id=s.student_id and n.attempt_no>s.attempt_no) then
    raise exception 'Choose the latest submitted attempt' using errcode='22023';
  end if;
  if not exists(select 1 from public.assignments a join public.group_members m on m.group_id=a.group_id
    where a.id=s.assignment_id and m.student_id=s.student_id) then raise exception 'Student no longer in group' using errcode='22023'; end if;
  insert into public.assignment_retake_grants(submission_id,assignment_id,student_id,granted_by)
    values(s.id,s.assignment_id,s.student_id,auth.uid()) on conflict do nothing;
  select count(*)::int into result from public.assignment_retake_grants r where r.assignment_id=s.assignment_id and r.student_id=s.student_id;
  return result;
end $$;

create or replace function public.get_assignment_report_rows(p_assignment uuid)
returns table(student_id uuid,full_name text,is_member boolean,submission_id uuid,attempt_no integer,status text,
  started_at timestamptz,submitted_at timestamptz,correct_count integer,total_count integer,extra_attempts integer)
language plpgsql stable security definer set search_path=public
as $$ begin
  if not public.can_manage_assignment(p_assignment) then raise exception 'Assignment unavailable' using errcode='42501'; end if;
  return query
  with students as (
    select m.student_id from public.group_members m join public.assignments a on a.group_id=m.group_id where a.id=p_assignment
    union select s.student_id from public.assignment_submissions s where s.assignment_id=p_assignment
  )
  select t.student_id,coalesce(nullif(btrim(p.full_name),''),'Ученик'),
    exists(select 1 from public.group_members m join public.assignments a on a.group_id=m.group_id where a.id=p_assignment and m.student_id=t.student_id),
    s.id,s.attempt_no,s.status,s.started_at,s.submitted_at,s.correct_count,s.total_count,
    (select count(*)::int from public.assignment_retake_grants r where r.assignment_id=p_assignment and r.student_id=t.student_id)
  from students t join public.profiles p on p.id=t.student_id
  left join lateral (select x.* from public.assignment_submissions x where x.assignment_id=p_assignment and x.student_id=t.student_id order by x.attempt_no desc limit 1) s on true
  order by p.full_name,t.student_id;
end $$;

create or replace function public.list_my_assignment_feedback()
returns table(assignment_id uuid,submission_id uuid)
language sql stable security definer set search_path=public
as $$ select distinct on(s.assignment_id) s.assignment_id,s.id from public.assignment_submissions s
  where s.student_id=auth.uid() and s.status='submitted' and exists(select 1 from public.assignment_feedback f where f.submission_id=s.id)
  order by s.assignment_id,s.attempt_no desc; $$;

-- Private server-only writes serialize answer saves and final grading on the
-- submission row. Client-supplied correctness is never accepted by the API.
create or replace function public.save_verified_assignment_answer(p_user uuid,p_submission uuid,p_question uuid,p_answer text,p_correct boolean,p_seconds integer)
returns void language plpgsql security invoker set search_path=public
as $$ declare s public.assignment_submissions%rowtype;
begin
  select * into s from public.assignment_submissions where id=p_submission and student_id=p_user for update;
  if not found or s.status<>'in_progress' then raise exception 'Attempt unavailable'; end if;
  if not exists(select 1 from public.assignment_questions q where q.assignment_id=s.assignment_id and q.question_id=p_question) then raise exception 'Question unavailable'; end if;
  if p_seconds is not null and p_seconds not between 0 and 86400 then raise exception 'Invalid time'; end if;
  insert into public.assignment_answers(submission_id,question_id,answer,is_correct,time_spent_seconds)
    values(p_submission,p_question,p_answer,case when p_answer is null then null else p_correct end,p_seconds)
  on conflict(submission_id,question_id) do update set answer=excluded.answer,is_correct=excluded.is_correct,answered_at=now(),
    time_spent_seconds=case when excluded.time_spent_seconds is null then assignment_answers.time_spent_seconds
      else greatest(coalesce(assignment_answers.time_spent_seconds,0),excluded.time_spent_seconds) end;
end $$;
create or replace function public.finalize_assignment_submission(p_user uuid,p_submission uuid)
returns void language plpgsql security invoker set search_path=public
as $$ declare s public.assignment_submissions%rowtype;
begin
  select * into s from public.assignment_submissions where id=p_submission and student_id=p_user for update;
  if not found then raise exception 'Attempt unavailable'; end if;
  if s.status='submitted' then return; end if;
  update public.assignment_submissions set status='submitted',submitted_at=now(),
    total_count=(select count(*) from public.assignment_questions where assignment_id=s.assignment_id),
    correct_count=(select count(*) from public.assignment_answers aa join public.assignment_questions aq on aq.question_id=aa.question_id and aq.assignment_id=s.assignment_id
      where aa.submission_id=s.id and aa.is_correct=true) where id=s.id;
end $$;

revoke all on function public.can_manage_submission(uuid), public.can_read_submission_feedback(uuid), public.can_write_submission_feedback(uuid,uuid),
  public.can_read_assignment_answers(uuid),public.grant_assignment_retake(uuid),public.get_assignment_report_rows(uuid),public.list_my_assignment_feedback()
from public,anon,authenticated;
grant execute on function public.can_manage_submission(uuid), public.can_read_submission_feedback(uuid), public.can_write_submission_feedback(uuid,uuid),
  public.can_read_assignment_answers(uuid),public.grant_assignment_retake(uuid),public.get_assignment_report_rows(uuid),public.list_my_assignment_feedback()
to authenticated,service_role;
revoke all on function public.save_verified_assignment_answer(uuid,uuid,uuid,text,boolean,integer),public.finalize_assignment_submission(uuid,uuid) from public,anon,authenticated;
grant execute on function public.save_verified_assignment_answer(uuid,uuid,uuid,text,boolean,integer),public.finalize_assignment_submission(uuid,uuid) to service_role;

create or replace function public.start_assignment_attempt(p_user uuid, p_assignment uuid)
returns uuid language plpgsql security invoker set search_path = public
as $$
declare
  asg public.assignments%rowtype;
  existing uuid;
  attempt_count integer;
  total integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || p_assignment::text, 2));
  select * into asg from public.assignments where id = p_assignment and published = true;
  if not found then raise exception 'Assignment unavailable'; end if;
  if asg.kind <> 'question_set' then raise exception 'Unsupported assignment kind'; end if;
  if not exists(select 1 from public.group_members gm where gm.group_id = asg.group_id and gm.student_id = p_user) then
    raise exception 'Not a member of this group';
  end if;
  select id into existing from public.assignment_submissions
    where assignment_id = p_assignment and student_id = p_user and status = 'in_progress'
    order by attempt_no desc limit 1;
  if existing is not null then return existing; end if;
  select count(*) into attempt_count from public.assignment_submissions
    where assignment_id = p_assignment and student_id = p_user;
  if attempt_count >= asg.max_attempts + (select count(*) from public.assignment_retake_grants r where r.assignment_id=p_assignment and r.student_id=p_user) then raise exception 'No attempts remaining'; end if;
  select count(*) into total from public.assignment_questions where assignment_id = p_assignment;
  if total = 0 then raise exception 'Assignment has no questions'; end if;
  insert into public.assignment_submissions(assignment_id, student_id, attempt_no, status, started_at, total_count)
    values(p_assignment, p_user, attempt_count + 1, 'in_progress', now(), total)
    returning id into existing;
  return existing;
end $$;


create or replace function public.list_student_assignments()
returns table(
  id uuid, group_id uuid, group_name text, title text, instructions text, kind text,
  paper_id uuid, paper_slug text, paper_title text, time_limit_minutes integer,
  due_at timestamptz, show_answers text, max_attempts integer, created_at timestamptz,
  total_questions integer, attempt_no integer, status text, started_at timestamptz,
  submitted_at timestamptz, correct_count integer, total_count integer, answered_count integer
)
language sql stable security definer set search_path = public
as $$
  select a.id, a.group_id, g.name, a.title, a.instructions, a.kind,
    a.paper_id, ep.slug, ep.title, a.time_limit_minutes,
    a.due_at, a.show_answers, a.max_attempts + (select count(*)::int from public.assignment_retake_grants r where r.assignment_id=a.id and r.student_id=auth.uid()), a.created_at,
    case when a.kind = 'question_set'
      then (select count(*)::integer from public.assignment_questions aq where aq.assignment_id = a.id) end,
    sub.attempt_no, sub.status, sub.started_at, sub.submitted_at, sub.correct_count, sub.total_count, sub.answered_count
  from public.assignments a
  join public.groups g on g.id = a.group_id
  left join public.exam_papers ep on ep.id = a.paper_id
  left join lateral (
    select s.id, s.attempt_no, s.status, s.started_at, s.submitted_at, s.correct_count, s.total_count,
      (select count(*)::integer from public.assignment_answers aa where aa.submission_id = s.id and nullif(btrim(aa.answer),'') is not null) as answered_count
    from public.assignment_submissions s
    where s.assignment_id = a.id and s.student_id = auth.uid()
    order by s.attempt_no desc limit 1
  ) sub on true
  where a.published and public.is_group_member(a.group_id)
  order by a.due_at;
$$;


-- Preserve server-only EXECUTE on the replaced start function.
revoke all on function public.start_assignment_attempt(uuid,uuid) from public,anon,authenticated;
grant execute on function public.start_assignment_attempt(uuid,uuid) to service_role;
create or replace function public.set_assignment_questions(p_assignment_id uuid, p_question_ids uuid[])
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  asg public.assignments%rowtype;
begin
  select * into asg from public.assignments where id = p_assignment_id for update;
  if not found or not public.can_manage_group(asg.group_id) then
    raise exception 'Assignment unavailable' using errcode = '42501';
  end if;
  if public.assignment_has_submissions(p_assignment_id) then
    raise exception 'Cannot change questions after an attempt starts' using errcode='22023';
  end if;
  if asg.kind <> 'question_set' then
    raise exception 'Only question-set assignments accept questions' using errcode = '22023';
  end if;
  if p_question_ids is null or cardinality(p_question_ids) = 0 or cardinality(p_question_ids) > 100 then
    raise exception 'Choose between 1 and 100 questions' using errcode = '22023';
  end if;
  if cardinality(p_question_ids) <> cardinality(array(select distinct unnest(p_question_ids))) then
    raise exception 'Duplicate questions selected' using errcode = '22023';
  end if;
  if (select count(*) from public.questions where id = any(p_question_ids)) <> cardinality(p_question_ids) then
    raise exception 'Some selected questions are unavailable' using errcode = '22023';
  end if;
  delete from public.assignment_questions where assignment_id = p_assignment_id;
  insert into public.assignment_questions(assignment_id, question_id, position)
  select p_assignment_id, q.question_id, q.position::integer
  from unnest(p_question_ids) with ordinality as q(question_id, position);
  return true;
end $$;


notify pgrst,'reload schema';
commit;
