-- Run after add_groups.sql. Adds the real schedule, lesson recordings and materials
-- that replace the sample data on /schedule, /recordings and /materials.
-- Materials are links (Google Drive, YouTube, Docs...), not uploads, so they do not
-- count against the Supabase Storage quota. Nothing existing is changed or deleted.
begin;

create table if not exists public.group_lessons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 150),
  starts_at timestamptz not null,
  duration_minutes integer not null default 90 check (duration_minutes between 15 and 480),
  meeting_url text check (meeting_url is null or meeting_url ~* '^https://[^\s]+$'),
  recording_url text check (recording_url is null or recording_url ~* '^https://[^\s]+$'),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_materials (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  lesson_id uuid references public.group_lessons(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 150),
  url text not null check (url ~* '^https://[^\s]+$'),
  kind text not null default 'link' check (kind in ('link', 'pdf', 'video', 'doc', 'sheet', 'slides')),
  description text check (description is null or char_length(description) <= 1000),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists group_lessons_group_starts_idx on public.group_lessons(group_id, starts_at);
create index if not exists group_materials_group_idx on public.group_materials(group_id, created_at desc);
create index if not exists group_materials_lesson_idx on public.group_materials(lesson_id);

alter table public.group_lessons enable row level security;
alter table public.group_materials enable row level security;
revoke all on public.group_lessons, public.group_materials from public, anon, authenticated;
grant select, delete on public.group_lessons, public.group_materials to authenticated;
grant insert (group_id, title, starts_at, duration_minutes, meeting_url, recording_url, notes)
  on public.group_lessons to authenticated;
grant update (title, starts_at, duration_minutes, meeting_url, recording_url, notes)
  on public.group_lessons to authenticated;
grant insert (group_id, lesson_id, title, url, kind, description) on public.group_materials to authenticated;
grant update (lesson_id, title, url, kind, description) on public.group_materials to authenticated;
grant select, insert, update, delete on public.group_lessons, public.group_materials to service_role;

-- Staff who manage the group can do everything; its students can only read.
drop policy if exists group_lessons_read on public.group_lessons;
create policy group_lessons_read on public.group_lessons for select to authenticated using (
  public.can_manage_group(group_id) or (public.current_user_role() = 'student' and public.is_group_member(group_id))
);
drop policy if exists group_lessons_write on public.group_lessons;
create policy group_lessons_write on public.group_lessons for insert to authenticated
  with check (public.can_manage_group(group_id) and created_by = auth.uid());
drop policy if exists group_lessons_update on public.group_lessons;
create policy group_lessons_update on public.group_lessons for update to authenticated
  using (public.can_manage_group(group_id)) with check (public.can_manage_group(group_id));
drop policy if exists group_lessons_delete on public.group_lessons;
create policy group_lessons_delete on public.group_lessons for delete to authenticated
  using (public.can_manage_group(group_id));

drop policy if exists group_materials_read on public.group_materials;
create policy group_materials_read on public.group_materials for select to authenticated using (
  public.can_manage_group(group_id) or (public.current_user_role() = 'student' and public.is_group_member(group_id))
);
drop policy if exists group_materials_write on public.group_materials;
create policy group_materials_write on public.group_materials for insert to authenticated
  with check (public.can_manage_group(group_id) and created_by = auth.uid());
drop policy if exists group_materials_update on public.group_materials;
create policy group_materials_update on public.group_materials for update to authenticated
  using (public.can_manage_group(group_id)) with check (public.can_manage_group(group_id));
drop policy if exists group_materials_delete on public.group_materials;
create policy group_materials_delete on public.group_materials for delete to authenticated
  using (public.can_manage_group(group_id));

-- A material attached to a lesson must belong to the same group.
create or replace function public.validate_group_material()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if new.lesson_id is not null and not exists(
    select 1 from public.group_lessons l where l.id = new.lesson_id and l.group_id = new.group_id
  ) then
    raise exception 'Lesson belongs to another group' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists validate_group_material on public.group_materials;
create trigger validate_group_material before insert or update of lesson_id, group_id on public.group_materials
for each row execute function public.validate_group_material();

create or replace function public.touch_group_lesson()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists touch_group_lesson on public.group_lessons;
create trigger touch_group_lesson before update on public.group_lessons
for each row execute function public.touch_group_lesson();

revoke all on function public.validate_group_material(), public.touch_group_lesson() from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
