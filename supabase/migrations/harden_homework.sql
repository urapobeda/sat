-- Run AFTER add_assignment_feedback.sql. No results are removed.
begin;
create or replace function public.assignment_answers_released(p_assignment uuid,p_student uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from assignments a where a.id=p_assignment and
 (a.show_answers='after_due' and now()>a.due_at or a.show_answers='after_submit' and
 (now()>a.due_at or (select count(*) from assignment_submissions s where s.assignment_id=a.id and s.student_id=p_student and s.status='submitted')
 >= a.max_attempts+(select count(*) from assignment_retake_grants r where r.assignment_id=a.id and r.student_id=p_student))));
$$;
create or replace function public.can_read_assignment_answers(p_submission uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.can_manage_submission(p_submission) or exists(select 1 from assignment_submissions s
 where s.id=p_submission and s.student_id=auth.uid() and s.status='submitted'
 and public.assignment_answers_released(s.assignment_id,s.student_id));
$$;

-- Commit the automatic submission before the HTTP layer rejects a late save.
-- Raising an SQL exception here would roll back the automatic submission.
create or replace function public.expire_assignment_attempt(p_user uuid,p_submission uuid)
returns boolean language plpgsql security invoker set search_path=public as $$
declare s assignment_submissions%rowtype; minutes integer;
begin
 select * into s from assignment_submissions where id=p_submission and student_id=p_user for update;
 if not found then raise exception 'Attempt unavailable'; end if;
 select time_limit_minutes into minutes from assignments where id=s.assignment_id;
 if s.status='in_progress' and minutes is not null and clock_timestamp()>s.started_at+make_interval(mins=>minutes)+interval '30 seconds' then
   perform public.finalize_assignment_submission(p_user,p_submission);
   return true;
 end if;
 return s.status='submitted';
end $$;
create or replace function public.finalize_assignment_submission(p_user uuid,p_submission uuid)
returns void language plpgsql security invoker set search_path=public as $$
declare s assignment_submissions%rowtype; minutes integer; effective_time timestamptz;
begin
 select * into s from assignment_submissions where id=p_submission and student_id=p_user for update;
 if not found then raise exception 'Attempt unavailable'; end if;
 if s.status='submitted' then return; end if;
 select time_limit_minutes into minutes from assignments where id=s.assignment_id;
 effective_time:=clock_timestamp();
 if minutes is not null then effective_time:=least(effective_time,s.started_at+make_interval(mins=>minutes)+interval '30 seconds'); end if;
 update assignment_submissions set status='submitted',submitted_at=effective_time,
 total_count=(select count(*) from assignment_questions where assignment_id=s.assignment_id),
 correct_count=(select count(*) from assignment_answers aa join assignment_questions aq on aq.question_id=aa.question_id
 and aq.assignment_id=s.assignment_id where aa.submission_id=s.id and aa.is_correct=true) where id=s.id;
end $$;
create or replace function public.save_verified_assignment_answer(p_user uuid,p_submission uuid,p_question uuid,p_answer text,p_correct boolean,p_seconds integer)
returns void language plpgsql security invoker set search_path=public as $$
declare s assignment_submissions%rowtype;
begin
 select * into s from assignment_submissions where id=p_submission and student_id=p_user for update;
 if not found or s.status<>'in_progress' then raise exception 'Attempt unavailable'; end if;
 if public.expire_assignment_attempt(p_user,p_submission) then return; end if;
 if not exists(select 1 from assignment_questions q where q.assignment_id=s.assignment_id and q.question_id=p_question) then raise exception 'Question unavailable'; end if;
 if p_seconds is not null and p_seconds not between 0 and 86400 then raise exception 'Invalid time'; end if;
 insert into assignment_answers(submission_id,question_id,answer,is_correct,time_spent_seconds)
 values(p_submission,p_question,p_answer,case when p_answer is null then null else p_correct end,p_seconds)
 on conflict(submission_id,question_id) do update set answer=excluded.answer,is_correct=excluded.is_correct,answered_at=clock_timestamp(),
 time_spent_seconds=greatest(assignment_answers.time_spent_seconds,excluded.time_spent_seconds);
end $$;
revoke all on function public.expire_assignment_attempt(uuid,uuid) from public,anon,authenticated;
grant execute on function public.expire_assignment_attempt(uuid,uuid) to service_role;
revoke all on function public.assignment_answers_released(uuid,uuid) from public,anon,authenticated;
grant execute on function public.assignment_answers_released(uuid,uuid) to service_role;

-- Calling a revoked helper directly from a policy fails: use a narrow definer wrapper.
create or replace function public.can_delete_assignment(p_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.can_manage_assignment(p_id) and not public.assignment_has_submissions(p_id);
$$;
revoke all on function public.can_delete_assignment(uuid) from public,anon;
grant execute on function public.can_delete_assignment(uuid) to authenticated,service_role;
drop policy if exists assignments_delete on assignments;
create policy assignments_delete on assignments for delete to authenticated using(public.can_delete_assignment(id));
revoke all on function public.assignment_has_submissions(uuid) from public,anon,authenticated;
grant execute on function public.assignment_has_submissions(uuid) to service_role;

create or replace function public.guard_started_assignment()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if (new.kind,new.paper_id,new.group_id,new.time_limit_minutes) is distinct from (old.kind,old.paper_id,old.group_id,old.time_limit_minutes)
 and public.assignment_has_submissions(old.id) then raise exception 'Students have started: duplicate the assignment' using errcode='22023'; end if;
 return new;
end $$;
drop trigger if exists guard_started_assignment on assignments;
create trigger guard_started_assignment before update on assignments for each row execute function public.guard_started_assignment();
revoke all on function public.guard_started_assignment() from public,anon,authenticated;

create or replace function public.duplicate_assignment(p_assignment uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare a assignments%rowtype; new_id uuid;
begin
 select * into a from assignments where id=p_assignment for share;
 if not found or not public.can_manage_assignment(p_assignment) then raise exception 'Assignment unavailable' using errcode='42501'; end if;
 if a.kind<>'question_set' then raise exception 'Past paper homework is temporarily unavailable' using errcode='22023'; end if;
 insert into assignments(group_id,created_by,title,instructions,kind,due_at,show_answers,max_attempts,time_limit_minutes,published)
 values(a.group_id,auth.uid(),left(a.title,190)||' (copy)',a.instructions,a.kind,a.due_at,a.show_answers,a.max_attempts,a.time_limit_minutes,false) returning id into new_id;
 insert into assignment_questions(assignment_id,question_id,position) select new_id,question_id,position from assignment_questions where assignment_id=a.id;
 return new_id;
end $$;
revoke all on function public.duplicate_assignment(uuid) from public,anon;
grant execute on function public.duplicate_assignment(uuid) to authenticated,service_role;

create or replace function public.question_in_pending_homework(p_user uuid,p_question uuid)
returns boolean language plpgsql volatile security definer set search_path=public as $$
begin
 perform public.expire_assignment_attempt(s.student_id,s.id) from assignment_submissions s join assignment_questions q on q.assignment_id=s.assignment_id
 where s.student_id=p_user and s.status='in_progress' and q.question_id=p_question;
 return exists(select 1 from assignments a join assignment_questions q on q.assignment_id=a.id
 join group_members gm on gm.group_id=a.group_id and gm.student_id=p_user
 where a.published and q.question_id=p_question and (not exists(select 1 from assignment_submissions s
 where s.assignment_id=a.id and s.student_id=p_user and s.status='submitted')
 or exists(select 1 from assignment_submissions s where s.assignment_id=a.id and s.student_id=p_user and s.status='in_progress')
 or (now()<=a.due_at and (select count(*) from assignment_submissions s where s.assignment_id=a.id and s.student_id=p_user)
 < a.max_attempts+(select count(*) from assignment_retake_grants r where r.assignment_id=a.id and r.student_id=p_user))));
end $$;
revoke all on function public.question_in_pending_homework(uuid,uuid) from public,anon,authenticated;
grant execute on function public.question_in_pending_homework(uuid,uuid) to service_role;
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
  select * into asg from public.assignments where id = p_assignment and published = true for update;
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



create or replace function public.get_assignment_report_rows(p_assignment uuid)
returns table(student_id uuid,full_name text,is_member boolean,submission_id uuid,attempt_no integer,status text,
  started_at timestamptz,submitted_at timestamptz,correct_count integer,total_count integer,extra_attempts integer)
language plpgsql volatile security definer set search_path=public
as $$ begin
  if not public.can_manage_assignment(p_assignment) then raise exception 'Assignment unavailable' using errcode='42501'; end if;
  perform public.expire_assignment_attempt(x.student_id,x.id) from assignment_submissions x where x.assignment_id=p_assignment and x.status='in_progress';
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


create or replace function public.refresh_my_assignment_deadlines()
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 perform public.expire_assignment_attempt(s.student_id,s.id) from assignment_submissions s where s.student_id=auth.uid() and s.status='in_progress';
end $$;
revoke all on function public.refresh_my_assignment_deadlines() from public,anon;
grant execute on function public.refresh_my_assignment_deadlines() to authenticated;

notify pgrst,'reload schema';
commit;
