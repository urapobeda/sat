-- Run after add_groups.sql (and add_interactive_papers.sql if past-paper homework is used).
-- Idempotent: safe to run again without losing assignments, submissions or answers.
begin;

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id),
  created_by uuid not null references public.profiles(id),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  instructions text not null default '' check (char_length(instructions) <= 5000),
  kind text not null check (kind in ('question_set', 'past_paper')),
  paper_id uuid references public.exam_papers(id),
  time_limit_minutes integer check (time_limit_minutes is null or time_limit_minutes > 0),
  due_at timestamptz not null,
  show_answers text not null default 'after_submit' check (show_answers in ('after_submit', 'after_due', 'never')),
  max_attempts integer not null default 1 check (max_attempts > 0 and max_attempts <= 10),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  constraint assignments_kind_paper_check check (
    (kind = 'past_paper' and paper_id is not null) or (kind = 'question_set' and paper_id is null)
  )
);
create index if not exists assignments_group_id_idx on public.assignments (group_id);
create index if not exists assignments_due_at_idx on public.assignments (due_at);

create table if not exists public.assignment_questions (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  position integer not null check (position > 0),
  primary key (assignment_id, question_id),
  unique (assignment_id, position)
);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id),
  attempt_no integer not null default 1 check (attempt_no > 0),
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  correct_count integer check (correct_count is null or correct_count >= 0),
  total_count integer check (total_count is null or total_count >= 0),
  unique (assignment_id, student_id, attempt_no)
);
create index if not exists assignment_submissions_assignment_id_idx on public.assignment_submissions (assignment_id);
create index if not exists assignment_submissions_student_id_idx on public.assignment_submissions (student_id);

create table if not exists public.assignment_answers (
  submission_id uuid not null references public.assignment_submissions(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  answer text,
  is_correct boolean,
  time_spent_seconds integer check (time_spent_seconds is null or time_spent_seconds >= 0),
  answered_at timestamptz not null default now(),
  primary key (submission_id, question_id)
);

alter table public.assignments enable row level security;
alter table public.assignment_questions enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.assignment_answers enable row level security;

revoke all on public.assignments, public.assignment_questions, public.assignment_submissions, public.assignment_answers
  from public, anon, authenticated;

-- Grading and status transitions are server-only (service_role). No authenticated
-- grant exists on assignment_submissions/assignment_answers, so a direct REST call
-- from a student can never write is_correct, correct_count or status.
grant select, insert, delete on public.assignments to authenticated;
grant update (title, instructions, kind, paper_id, time_limit_minutes, due_at, show_answers, max_attempts, published)
  on public.assignments to authenticated;
grant select on public.assignment_questions to authenticated;
grant select, insert, update, delete on public.assignments, public.assignment_questions,
  public.assignment_submissions, public.assignment_answers to service_role;

-- Narrow definer helper avoids recursive assignments <-> assignment_submissions RLS policies.
create or replace function public.can_manage_assignment(p_assignment_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.assignments a where a.id = p_assignment_id and public.can_manage_group(a.group_id));
$$;

-- authenticated has no grant on assignment_submissions at all, so the delete policy
-- below cannot reference that table directly; a definer function reads it instead.
create or replace function public.assignment_has_submissions(p_assignment_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.assignment_submissions s where s.assignment_id = p_assignment_id);
$$;

drop policy if exists assignments_read on public.assignments;
create policy assignments_read on public.assignments for select to authenticated using (
  public.can_manage_group(group_id) or
  (public.current_user_role() = 'student' and published and public.is_group_member(group_id))
);
drop policy if exists assignments_insert on public.assignments;
create policy assignments_insert on public.assignments for insert to authenticated with check (
  created_by = auth.uid() and public.is_staff() and public.can_manage_group(group_id)
);
drop policy if exists assignments_update on public.assignments;
create policy assignments_update on public.assignments for update to authenticated
  using (public.can_manage_group(group_id)) with check (public.can_manage_group(group_id));
drop policy if exists assignments_delete on public.assignments;
create policy assignments_delete on public.assignments for delete to authenticated using (
  public.can_manage_group(group_id) and not public.assignment_has_submissions(id)
);

drop policy if exists assignment_questions_read on public.assignment_questions;
create policy assignment_questions_read on public.assignment_questions for select to authenticated using (
  exists(select 1 from public.assignments a where a.id = assignment_id and (
    public.can_manage_group(a.group_id) or
    (public.current_user_role() = 'student' and a.published and public.is_group_member(a.group_id))
  ))
);

-- A draft cannot be published without content; service_role (grading/admin tooling)
-- can still bypass this to backfill legacy rows if ever needed.
create or replace function public.validate_assignment_publish()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if new.published and not old.published and new.kind = 'question_set'
     and not exists(select 1 from public.assignment_questions where assignment_id = new.id) then
    raise exception 'Add at least one question before publishing' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists validate_assignment_publish on public.assignments;
create trigger validate_assignment_publish before update of published on public.assignments
for each row execute function public.validate_assignment_publish();

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

-- Resumable across devices: returns the existing in-progress attempt if one exists.
-- Invoker runs as service_role (called only from server routes with a trusted p_user).
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
  if attempt_count >= asg.max_attempts then raise exception 'No attempts remaining'; end if;
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
    a.due_at, a.show_answers, a.max_attempts, a.created_at,
    case when a.kind = 'question_set'
      then (select count(*)::integer from public.assignment_questions aq where aq.assignment_id = a.id) end,
    sub.attempt_no, sub.status, sub.started_at, sub.submitted_at, sub.correct_count, sub.total_count, sub.answered_count
  from public.assignments a
  join public.groups g on g.id = a.group_id
  left join public.exam_papers ep on ep.id = a.paper_id
  left join lateral (
    select s.id, s.attempt_no, s.status, s.started_at, s.submitted_at, s.correct_count, s.total_count,
      (select count(*)::integer from public.assignment_answers aa where aa.submission_id = s.id) as answered_count
    from public.assignment_submissions s
    where s.assignment_id = a.id and s.student_id = auth.uid()
    order by s.attempt_no desc limit 1
  ) sub on true
  where a.published and public.is_group_member(a.group_id)
  order by a.due_at;
$$;

create or replace function public.list_teacher_assignments(p_group_id uuid default null)
returns table(
  id uuid, group_id uuid, group_name text, title text, kind text, paper_id uuid,
  paper_slug text, paper_title text, due_at timestamptz, show_answers text,
  max_attempts integer, published boolean, created_at timestamptz,
  total_questions integer, group_size integer, submitted_count integer
)
language sql stable security definer set search_path = public
as $$
  select a.id, a.group_id, g.name, a.title, a.kind, a.paper_id, ep.slug, ep.title,
    a.due_at, a.show_answers, a.max_attempts, a.published, a.created_at,
    case when a.kind = 'question_set'
      then (select count(*)::integer from public.assignment_questions aq where aq.assignment_id = a.id) end,
    (select count(*)::integer from public.group_members gm where gm.group_id = a.group_id),
    case when a.kind = 'question_set' then
      (select count(distinct s.student_id)::integer from public.assignment_submissions s
        where s.assignment_id = a.id and s.status = 'submitted')
    end
  from public.assignments a
  join public.groups g on g.id = a.group_id
  left join public.exam_papers ep on ep.id = a.paper_id
  where public.can_manage_group(a.group_id) and (p_group_id is null or a.group_id = p_group_id)
  order by a.due_at;
$$;

create or replace function public.get_assignment_roster(p_assignment_id uuid)
returns table(
  student_id uuid, full_name text, attempt_no integer, status text,
  started_at timestamptz, submitted_at timestamptz, correct_count integer, total_count integer
)
language plpgsql stable security definer set search_path = public
as $$
declare v_group uuid;
begin
  select group_id into v_group from public.assignments where id = p_assignment_id;
  if v_group is null or not public.can_manage_group(v_group) then
    raise exception 'Assignment unavailable' using errcode = '42501';
  end if;
  return query
  select m.student_id, coalesce(nullif(btrim(p.full_name), ''), 'Ученик'),
    sub.attempt_no, sub.status, sub.started_at, sub.submitted_at, sub.correct_count, sub.total_count
  from public.group_members m
  join public.profiles p on p.id = m.student_id
  left join lateral (
    select s.attempt_no, s.status, s.started_at, s.submitted_at, s.correct_count, s.total_count
    from public.assignment_submissions s
    where s.assignment_id = p_assignment_id and s.student_id = m.student_id
    order by s.attempt_no desc limit 1
  ) sub on true
  where m.group_id = v_group
  order by p.full_name, m.student_id;
end $$;

revoke all on function
  public.can_manage_assignment(uuid), public.assignment_has_submissions(uuid),
  public.set_assignment_questions(uuid, uuid[]),
  public.start_assignment_attempt(uuid, uuid), public.list_student_assignments(),
  public.list_teacher_assignments(uuid), public.get_assignment_roster(uuid),
  public.validate_assignment_publish()
from public, anon, authenticated;

grant execute on function
  public.can_manage_assignment(uuid), public.assignment_has_submissions(uuid),
  public.set_assignment_questions(uuid, uuid[]),
  public.list_student_assignments(), public.list_teacher_assignments(uuid),
  public.get_assignment_roster(uuid)
to authenticated, service_role;
grant execute on function public.start_assignment_attempt(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
commit;
