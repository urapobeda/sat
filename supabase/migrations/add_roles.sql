begin;

do $$ begin
  create type public.user_role as enum ('student', 'teacher', 'admin');
exception when duplicate_object then null;
end $$;

alter table public.profiles add column if not exists role public.user_role not null default 'student';
alter table public.profiles alter column role set default 'student';
update public.profiles set role = 'student' where role is null;
alter table public.profiles alter column role set not null;
alter table public.profiles enable row level security;

-- A column REVOKE alone would not override existing table-level UPDATE grants.
-- Use an invoker trigger for BOTH updates and privileged inserts/upserts instead.
-- Trusted SQL Editor/maintenance connections may also bootstrap the first admin.
create or replace function public.guard_profile_role()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    if (tg_op = 'INSERT' and new.role <> 'student') then
      raise exception 'Role changes require the server' using errcode = '42501';
    elsif tg_op = 'UPDATE' then
      if new.role is distinct from old.role then
        raise exception 'Role changes require the server' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role before insert or update on public.profiles
for each row execute function public.guard_profile_role();

create or replace function public.current_user_role()
returns public.user_role language sql security definer stable set search_path = public
as $$
  select coalesce((select p.role from public.profiles p where p.id = auth.uid()), 'student'::public.user_role);
$$;

create or replace function public.is_staff()
returns boolean language sql security definer stable set search_path = public
as $$ select public.current_user_role() in ('teacher', 'admin'); $$;

revoke all on function public.guard_profile_role() from public, anon, authenticated;
revoke all on function public.current_user_role() from public, anon;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.current_user_role(), public.is_staff() to authenticated, service_role;

-- The admin API is the only caller. Including auth.users means accounts without
-- an existing profile are still shown; auth metadata never determines the role.
create or replace function public.admin_list_users(p_search text default '', p_offset integer default 0)
returns table(id uuid, full_name text, email text, role public.user_role, created_at timestamptz, total_count bigint)
language sql security definer stable set search_path = public
as $$
  select u.id, coalesce(p.full_name, u.raw_user_meta_data->>'full_name'), u.email,
    coalesce(p.role, 'student'::public.user_role), u.created_at, count(*) over()
  from auth.users u left join public.profiles p on p.id = u.id
  where coalesce(u.is_anonymous, false) = false
    and (coalesce(p_search, '') = ''
      or position(lower(left(p_search, 200)) in lower(coalesce(u.email, ''))) > 0
      or position(lower(left(p_search, 200)) in lower(coalesce(p.full_name, u.raw_user_meta_data->>'full_name', ''))) > 0)
  order by u.created_at desc, u.id
  limit 50 offset greatest(0, least(coalesce(p_offset, 0), 1000000));
$$;

create or replace function public.admin_set_user_role(p_actor_id uuid, p_user_id uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public
as $$
begin
  -- Lock the actor so a concurrent demotion cannot race this permission check.
  perform 1 from public.profiles where id = p_actor_id and role = 'admin' for update;
  if not found then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_actor_id = p_user_id and p_role <> 'admin' then
    raise exception 'Cannot remove your own admin role' using errcode = '42501';
  end if;
  if p_role is null then raise exception 'Role required' using errcode = '22023'; end if;
  insert into public.profiles(id, email, full_name, role)
    select u.id, u.email, u.raw_user_meta_data->>'full_name', p_role
    from auth.users u where u.id = p_user_id and coalesce(u.is_anonymous, false) = false
  on conflict (id) do update set role = excluded.role;
  if not found then raise exception 'User not found' using errcode = 'P0002'; end if;
end;
$$;

revoke all on function public.admin_list_users(text, integer), public.admin_set_user_role(uuid, uuid, public.user_role) from public, anon, authenticated;
grant execute on function public.admin_list_users(text, integer), public.admin_set_user_role(uuid, uuid, public.user_role) to service_role;

notify pgrst, 'reload schema';
commit;

-- First admin (run manually in the SQL Editor, replace the email):
-- update profiles set role='admin' where id = (select id from auth.users where email='owner@example.com');
