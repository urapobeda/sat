-- Run after add_roles.sql. No existing questions, results or memberships deleted.
begin;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  teacher_id uuid not null references public.profiles(id),
  join_code text not null unique check (join_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$'),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id uuid not null references public.groups(id),
  student_id uuid not null references public.profiles(id),
  joined_at timestamptz not null default now(),
  primary key (group_id, student_id)
);
create index if not exists groups_teacher_id_idx on public.groups(teacher_id);
create index if not exists group_members_student_id_idx on public.group_members(student_id);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
revoke all on public.groups, public.group_members from public, anon, authenticated;
grant select on public.groups, public.group_members to authenticated;
grant update (name, archived, teacher_id) on public.groups to authenticated;
grant delete on public.group_members to authenticated;
grant select, insert, update, delete on public.groups, public.group_members to service_role;

-- Narrow definer helpers avoid recursive groups <-> group_members RLS policies.
create or replace function public.can_manage_group(p_group_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.current_user_role() = 'admin' or
    (public.current_user_role() = 'teacher' and exists
      (select 1 from public.groups g where g.id = p_group_id and g.teacher_id = auth.uid()));
$$;
create or replace function public.is_group_member(p_group_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.group_members m where m.group_id = p_group_id and m.student_id = auth.uid()); $$;

drop policy if exists groups_read on public.groups;
create policy groups_read on public.groups for select to authenticated using (
  public.can_manage_group(id) or (public.current_user_role() = 'student' and public.is_group_member(id))
);
drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups for update to authenticated
  using (public.can_manage_group(id)) with check (
    public.current_user_role() = 'admin' or (public.current_user_role() = 'teacher' and teacher_id = auth.uid())
  );
drop policy if exists group_members_read on public.group_members;
create policy group_members_read on public.group_members for select to authenticated using (
  public.can_manage_group(group_id) or (public.current_user_role() = 'student' and student_id = auth.uid())
);
drop policy if exists group_members_remove on public.group_members;
create policy group_members_remove on public.group_members for delete to authenticated using (public.can_manage_group(group_id));
-- Even an accidental later INSERT grant cannot bypass the invitation function.
drop policy if exists group_members_no_direct_insert on public.group_members;
create policy group_members_no_direct_insert on public.group_members as restrictive
  for insert to authenticated with check (false);

-- No broad SELECT policy/grant is added to profiles or to any results table.
create or replace function public.validate_group_teacher()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if not exists(select 1 from public.profiles p where p.id = new.teacher_id and p.role in ('teacher', 'admin')) then
    raise exception 'Group teacher must be staff' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists validate_group_teacher on public.groups;
create trigger validate_group_teacher before insert or update of teacher_id on public.groups
for each row execute function public.validate_group_teacher();

create or replace function public.new_group_join_code()
returns text language plpgsql volatile security definer set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  result text;
  attempt integer;
  i integer;
begin
  for attempt in 1..12 loop
    bytes := decode(md5(gen_random_uuid()::text), 'hex');
    result := '';
    for i in 0..7 loop result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1); end loop;
    if not exists(select 1 from public.groups g where g.join_code = result) then return result; end if;
  end loop;
  raise exception 'Unable to generate code';
end $$;

create or replace function public.create_group(p_name text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare result uuid;
begin
  if auth.uid() is null or not public.is_staff() then raise exception 'Staff required' using errcode = '42501'; end if;
  -- Unique constraint is the final collision guard, including concurrent creates.
  for attempt in 1..12 loop
    begin
      insert into public.groups(name, teacher_id, join_code)
        values(btrim(p_name), auth.uid(), public.new_group_join_code()) returning id into result;
      return result;
    exception when unique_violation then null;
    end;
  end loop;
  raise exception 'Unable to create group';
end $$;

create or replace function public.rotate_group_code(p_group_id uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare result text;
begin
  perform 1 from public.groups where id = p_group_id for update;
  if not found or not public.can_manage_group(p_group_id) then raise exception 'Group unavailable' using errcode = '42501'; end if;
  for attempt in 1..12 loop
    begin
      result := public.new_group_join_code();
      update public.groups set join_code = result where id = p_group_id;
      return result;
    exception when unique_violation then null;
    end;
  end loop;
  raise exception 'Unable to generate code';
end $$;

create or replace function public.join_group_by_code(code text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare target uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = auth.uid() and p.role = 'student' and coalesce(u.is_anonymous, false) = false) then
    raise exception 'Student account required' using errcode = '42501';
  end if;
  if code is null or upper(btrim(code)) !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$' then
    raise exception 'Invalid or archived invitation' using errcode = '22023';
  end if;
  select g.id into target from public.groups g
    where g.join_code = upper(btrim(code)) and not g.archived for update;
  if not found then raise exception 'Invalid or archived invitation' using errcode = '22023'; end if;
  insert into public.group_members(group_id, student_id) values(target, auth.uid()) on conflict do nothing;
  return target;
end $$;

create or replace function public.list_my_groups(p_group_id uuid default null)
returns table(id uuid, name text, teacher_id uuid, teacher_name text, join_code text, archived boolean, created_at timestamptz, member_count bigint)
language sql stable security definer set search_path = public
as $$
  select g.id, g.name, g.teacher_id, coalesce(nullif(btrim(p.full_name), ''), u.raw_user_meta_data->>'full_name', 'Учитель'),
    g.join_code, g.archived, g.created_at, (select count(*) from public.group_members m where m.group_id = g.id)
  from public.groups g join public.profiles p on p.id = g.teacher_id join auth.users u on u.id = p.id
  where (p_group_id is null or g.id = p_group_id)
    and (public.can_manage_group(g.id) or (public.current_user_role() = 'student' and public.is_group_member(g.id)))
  order by g.archived, g.created_at desc, g.id;
$$;

create or replace function public.get_group_members(p_group_id uuid)
returns table(student_id uuid, full_name text, avatar_url text, joined_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$ begin
  if not public.can_manage_group(p_group_id) then raise exception 'Group unavailable' using errcode = '42501'; end if;
  return query select m.student_id, coalesce(nullif(btrim(p.full_name), ''), u.raw_user_meta_data->>'full_name', 'Ученик'),
    u.raw_user_meta_data->>'avatar_url', m.joined_at
    from public.group_members m join public.profiles p on p.id = m.student_id join auth.users u on u.id = p.id
    where m.group_id = p_group_id order by m.joined_at, m.student_id;
end $$;

create or replace function public.list_group_teachers()
returns table(id uuid, full_name text)
language plpgsql stable security definer set search_path = public
as $$ begin
  if public.current_user_role() <> 'admin' then raise exception 'Admin required' using errcode = '42501'; end if;
  return query select p.id, coalesce(nullif(btrim(p.full_name), ''), 'Учитель') from public.profiles p where p.role in ('teacher', 'admin') order by p.full_name, p.id;
end $$;

revoke all on function public.validate_group_teacher(), public.new_group_join_code() from public, anon, authenticated;
revoke all on function public.can_manage_group(uuid), public.is_group_member(uuid), public.create_group(text), public.rotate_group_code(uuid), public.join_group_by_code(text), public.list_my_groups(uuid), public.get_group_members(uuid), public.list_group_teachers() from public, anon, authenticated;
grant execute on function public.can_manage_group(uuid), public.is_group_member(uuid), public.create_group(text), public.rotate_group_code(uuid), public.join_group_by_code(text), public.list_my_groups(uuid), public.get_group_members(uuid), public.list_group_teachers() to authenticated, service_role;

notify pgrst, 'reload schema';
commit;
