-- Requires add_past_papers.sql. Adds interactive content alongside existing PDFs.
begin;

create table if not exists public.paper_items (
  id uuid primary key,
  module_id uuid not null references public.exam_modules(id) on delete restrict,
  position integer not null check (position > 0),
  question_type text not null check (question_type in ('multiple-choice', 'student-produced-response')),
  text text not null default '',
  image_paths text[] not null default '{}',
  unique (module_id, position)
);
create table if not exists public.paper_solutions (
  item_id uuid primary key references public.paper_items(id) on delete restrict,
  accepted_answers text[] not null check (cardinality(accepted_answers) > 0)
);
create table if not exists public.paper_module_runs (
  attempt_id uuid not null references public.exam_attempts(id) on delete restrict,
  module_id uuid not null references public.exam_modules(id) on delete restrict,
  ordinal integer not null check (ordinal > 0),
  answers jsonb not null default '{}',
  flags jsonb not null default '{}',
  current_index integer not null default 0 check (current_index >= 0),
  revision integer not null default 0,
  started_at timestamptz,
  deadline timestamptz,
  completed_at timestamptz,
  score integer check (score is null or score >= 0),
  graded jsonb,
  primary key (attempt_id, module_id),
  unique (attempt_id, ordinal)
);
alter table public.paper_items enable row level security;
alter table public.paper_solutions enable row level security;
alter table public.paper_module_runs enable row level security;
revoke all on public.paper_items, public.paper_solutions, public.paper_module_runs from public, anon, authenticated;
grant all on public.paper_items, public.paper_solutions, public.paper_module_runs to service_role;
grant select on public.paper_module_runs to authenticated;
drop policy if exists "Owners read module runs" on public.paper_module_runs;
create policy "Owners read module runs" on public.paper_module_runs for select to authenticated
using (exists(select 1 from public.exam_attempts a where a.id = attempt_id and a.user_id = auth.uid()));

-- Attempts are created, timed and graded by the server. Student reads retain RLS.
revoke insert, update, delete on public.exam_attempts from anon, authenticated;
grant select, insert, update on public.exam_attempts, public.exam_modules, public.exam_papers to service_role;

insert into storage.buckets(id, name, public, allowed_mime_types)
values ('paper-question-images', 'paper-question-images', false, array['image/webp'])
on conflict(id) do nothing;
-- Images and solutions are served by authenticated server endpoints.

create or replace function public.open_paper_attempt(p_user uuid, p_slug text, p_section text)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  paper public.exam_papers%rowtype;
  attempt_id uuid;
  first_module uuid;
  total integer;
begin
  if p_section not in ('full', 'math', 'reading-writing') or p_user is null then
    raise exception 'Invalid attempt';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || p_slug || p_section, 0));
  select * into paper from public.exam_papers where slug = p_slug and is_published;
  if not found then raise exception 'Paper unavailable'; end if;
  select a.id into attempt_id from public.exam_attempts a
    where a.paper_id = paper.id and a.user_id = p_user and a.selected_section = p_section
      and a.status = 'in-progress' and exists(select 1 from public.paper_module_runs r where r.attempt_id = a.id)
    order by a.started_at desc limit 1;
  if attempt_id is not null then return attempt_id; end if;
  select sum(question_count) into total from public.exam_modules
    where paper_id = paper.id and (p_section = 'full' or section = p_section);
  if coalesce(total, 0) = 0 then raise exception 'Section unavailable'; end if;
  if exists (
    select 1 from public.exam_modules m
    where m.paper_id = paper.id and (p_section = 'full' or m.section = p_section)
      and (m.question_count <> (select count(*) from public.paper_items i where i.module_id = m.id)
        or exists(select 1 from public.paper_items i left join public.paper_solutions s on s.item_id = i.id
                  where i.module_id = m.id and s.item_id is null))
  ) then raise exception 'Paper import incomplete'; end if;
  select id into first_module from public.exam_modules where paper_id = paper.id
    and (p_section = 'full' or section = p_section) order by sort_order limit 1;
  insert into public.exam_attempts(user_id, paper_id, selected_section, status, current_module_id)
    values(p_user, paper.id, p_section, 'in-progress', first_module) returning id into attempt_id;
  insert into public.paper_module_runs(attempt_id, module_id, ordinal, started_at, deadline)
    select attempt_id, id, row_number() over(order by sort_order),
      case when id = first_module then now() end,
      case when id = first_module then now() + make_interval(secs => duration_seconds) end
    from public.exam_modules where paper_id = paper.id and (p_section = 'full' or section = p_section);
  return attempt_id;
end $$;

create or replace function public.update_paper_attempt(
  p_user uuid, p_attempt uuid, p_module uuid, p_revision integer,
  p_answers jsonb, p_flags jsonb, p_index integer,
  p_submit boolean, p_graded jsonb
) returns boolean language plpgsql security invoker set search_path = public as $$
declare
  a public.exam_attempts%rowtype;
  r public.paper_module_runs%rowtype;
  m public.exam_modules%rowtype;
  next_id uuid;
  elapsed integer;
begin
  select * into a from public.exam_attempts where id = p_attempt and user_id = p_user for update;
  if not found then raise exception 'Attempt unavailable'; end if;
  select * into r from public.paper_module_runs where attempt_id = p_attempt and module_id = p_module for update;
  if not found then raise exception 'Module unavailable'; end if;
  if r.completed_at is not null then return true; end if;
  if a.current_module_id <> p_module or a.status <> 'in-progress' then raise exception 'Module locked'; end if;
  if r.revision <> p_revision then return false; end if;
  select * into m from public.exam_modules where id = p_module;
  if p_submit then
    if jsonb_typeof(p_graded) <> 'object' or (select count(*) from jsonb_object_keys(p_graded)) <> m.question_count then
      raise exception 'Incomplete grade';
    end if;
    if exists(select 1 from public.paper_items i where i.module_id = p_module
       and jsonb_typeof(p_graded -> i.id::text) is distinct from 'boolean') then raise exception 'Invalid grade'; end if;
    update public.paper_module_runs set completed_at = now(), graded = p_graded,
      score = (select count(*) from jsonb_each(p_graded) v where v.value = 'true'::jsonb), revision = revision + 1
      where attempt_id = p_attempt and module_id = p_module;
    elapsed := least(m.duration_seconds, greatest(0, extract(epoch from(now() - r.started_at))::integer));
    select module_id into next_id from public.paper_module_runs
      where attempt_id = p_attempt and ordinal = r.ordinal + 1;
    update public.exam_attempts set current_module_id = next_id,
      time_spent_seconds = time_spent_seconds + elapsed,
      current_question_index = current_question_index + m.question_count,
      status = case when next_id is null then 'completed' else 'in-progress' end,
      completed_at = case when next_id is null then now() end,
      raw_score = (select sum(score) from public.paper_module_runs where attempt_id = p_attempt)
      where id = p_attempt;
    if next_id is not null then
      update public.paper_module_runs set started_at = now(),
        deadline = now() + make_interval(secs => (select duration_seconds from public.exam_modules where id = next_id))
        where attempt_id = p_attempt and module_id = next_id;
    end if;
  else
    if now() >= r.deadline then return true; end if;
    if jsonb_typeof(p_answers) <> 'object' or jsonb_typeof(p_flags) <> 'object'
      or p_index < 0 or p_index >= m.question_count then raise exception 'Invalid draft'; end if;
    if exists(select 1 from jsonb_each(p_answers) v where
      not exists(select 1 from public.paper_items i where i.module_id = p_module and i.id::text = v.key)
      or jsonb_typeof(v.value) <> 'string' or length(v.value #>> '{}') > 100) then raise exception 'Invalid answer'; end if;
    if exists(select 1 from jsonb_each(p_flags) v where
      not exists(select 1 from public.paper_items i where i.module_id = p_module and i.id::text = v.key)
      or jsonb_typeof(v.value) <> 'boolean') then raise exception 'Invalid flag'; end if;
    update public.paper_module_runs set answers = answers || p_answers, flags = flags || p_flags,
      current_index = p_index, revision = revision + 1 where attempt_id = p_attempt and module_id = p_module;
  end if;
  return true;
end $$;

revoke all on function public.open_paper_attempt(uuid,text,text) from public, anon, authenticated;
revoke all on function public.update_paper_attempt(uuid,uuid,uuid,integer,jsonb,jsonb,integer,boolean,jsonb) from public, anon, authenticated;
grant execute on function public.open_paper_attempt(uuid,text,text) to service_role;
grant execute on function public.update_paper_attempt(uuid,uuid,uuid,integer,jsonb,jsonb,integer,boolean,jsonb) to service_role;
commit;
