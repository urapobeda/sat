-- Apply after add_roles.sql, add_groups.sql and add_lessons.sql.
-- Common words are shared across the author's groups, never across unrelated teachers.
begin;
do $$ begin
  if to_regclass('public.lessons') is null then
    raise exception 'Apply add_lessons.sql before add_vocabulary.sql';
  end if;
end $$;
create table if not exists public.vocabulary_words (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id),
  word text not null check (word = btrim(word) and char_length(word) between 1 and 100 and word ~ '^[[:alpha:]]+([''’\-][[:alpha:]]+)*$'),
  part_of_speech text not null default '' check (char_length(part_of_speech) <= 80),
  definition_en text not null check (char_length(btrim(definition_en)) between 1 and 4000),
  translation_ru text not null check (char_length(btrim(translation_ru)) between 1 and 1000),
  example text not null default '' check (char_length(example) <= 4000),
  lesson_id uuid references public.lessons(id) on delete set null,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists vocabulary_group_word_idx on public.vocabulary_words(group_id,lower(word)) where group_id is not null;
-- A normal UNIQUE(word, group_id) would allow duplicate NULL/common entries.
create unique index if not exists vocabulary_common_word_idx on public.vocabulary_words(created_by,lower(word)) where group_id is null;
create index if not exists vocabulary_lesson_idx on public.vocabulary_words(lesson_id);
alter table public.vocabulary_words enable row level security;
revoke all on public.vocabulary_words from public,anon,authenticated;
grant select,insert,delete on public.vocabulary_words to authenticated;
grant update(group_id,word,part_of_speech,definition_en,translation_ru,example,lesson_id) on public.vocabulary_words to authenticated;
grant select,insert,update,delete on public.vocabulary_words to service_role;

create or replace function public.can_manage_vocabulary(p_group uuid,p_author uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.current_user_role()='admin' or (public.current_user_role()='teacher' and
    ((p_group is null and p_author=auth.uid()) or (p_group is not null and public.can_manage_group(p_group))));
$$;
create or replace function public.can_read_vocabulary(p_group uuid,p_author uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.can_manage_vocabulary(p_group,p_author) or (public.current_user_role()='student' and
    ((p_group is not null and public.is_group_member(p_group)) or (p_group is null and exists(
      select 1 from public.groups g join public.group_members m on m.group_id=g.id
      where m.student_id=auth.uid() and g.teacher_id=p_author))));
$$;
revoke all on function public.can_manage_vocabulary(uuid,uuid),public.can_read_vocabulary(uuid,uuid) from public,anon;
grant execute on function public.can_manage_vocabulary(uuid,uuid),public.can_read_vocabulary(uuid,uuid) to authenticated,service_role;
drop policy if exists vocabulary_read on public.vocabulary_words;
create policy vocabulary_read on public.vocabulary_words for select to authenticated using(public.can_read_vocabulary(group_id,created_by));
drop policy if exists vocabulary_create on public.vocabulary_words;
create policy vocabulary_create on public.vocabulary_words for insert to authenticated with check(created_by=auth.uid() and public.can_manage_vocabulary(group_id,created_by));
drop policy if exists vocabulary_update on public.vocabulary_words;
create policy vocabulary_update on public.vocabulary_words for update to authenticated using(public.can_manage_vocabulary(group_id,created_by)) with check(public.can_manage_vocabulary(group_id,created_by));
drop policy if exists vocabulary_delete on public.vocabulary_words;
create policy vocabulary_delete on public.vocabulary_words for delete to authenticated using(public.can_manage_vocabulary(group_id,created_by));

create or replace function public.validate_vocabulary_lesson()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='UPDATE' then
    if new.created_by is distinct from old.created_by then raise exception 'Vocabulary author cannot be changed' using errcode='42501'; end if;
  end if;
  if new.lesson_id is not null and (tg_op='INSERT' or new.lesson_id is distinct from old.lesson_id or new.group_id is distinct from old.group_id) then
    if not exists(select 1 from public.lessons l join public.groups g on g.id=l.group_id
      where l.id=new.lesson_id and ((new.group_id is not null and l.group_id=new.group_id) or (new.group_id is null and g.teacher_id=new.created_by))) then
      raise exception 'The lesson must belong to the selected group or vocabulary author' using errcode='22023';
    end if;
  end if;
  new.updated_at=now(); return new;
end $$;
revoke all on function public.validate_vocabulary_lesson() from public,anon,authenticated;
drop trigger if exists validate_vocabulary_lesson on public.vocabulary_words;
create trigger validate_vocabulary_lesson before insert or update on public.vocabulary_words for each row execute function public.validate_vocabulary_lesson();

create or replace function public.list_vocabulary_words()
returns table(id uuid,group_id uuid,word text,part_of_speech text,definition_en text,translation_ru text,example text,lesson_id uuid,created_by uuid,created_at timestamptz,updated_at timestamptz,group_name text,lesson_title text)
language sql stable security invoker set search_path=public as $$
  select v.id,v.group_id,v.word,v.part_of_speech,v.definition_en,v.translation_ru,v.example,v.lesson_id,v.created_by,v.created_at,v.updated_at,g.name,l.title
  from public.vocabulary_words v left join public.groups g on g.id=v.group_id left join public.lessons l on l.id=v.lesson_id
  order by lower(v.word),v.id;
$$;
create or replace function public.add_vocabulary_batch(p_group_id uuid,p_lesson_id uuid,p_rows jsonb)
returns table(inserted integer,skipped integer) language plpgsql security invoker set search_path=public as $$
declare n integer; total integer;
begin
  if not coalesce(public.can_manage_vocabulary(p_group_id,auth.uid()),false) then raise exception 'Forbidden' using errcode='42501'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'Expected an array' using errcode='22023'; end if;
  total=jsonb_array_length(p_rows);
  if total<1 or total>500 then raise exception 'Expected 1 to 500 words' using errcode='22023'; end if;
  insert into public.vocabulary_words(group_id,lesson_id,word,translation_ru,definition_en,created_by)
    select p_group_id,p_lesson_id,btrim(x->>'word'),btrim(x->>'translation_ru'),btrim(x->>'definition_en'),auth.uid() from jsonb_array_elements(p_rows) x
    on conflict do nothing;
  get diagnostics n=row_count;
  return query select n,total-n;
end $$;
revoke all on function public.list_vocabulary_words(),public.add_vocabulary_batch(uuid,uuid,jsonb) from public,anon;
grant execute on function public.list_vocabulary_words(),public.add_vocabulary_batch(uuid,uuid,jsonb) to authenticated,service_role;
notify pgrst,'reload schema';
commit;
