alter table public.questions
add column if not exists source_question_id text,
add column if not exists source_name text,
add column if not exists category text,
add column if not exists source_page_start integer,
add column if not exists source_page_end integer,
add column if not exists image_urls jsonb not null default '[]'::jsonb,
add column if not exists question_type text not null default 'multiple-choice'
  check (question_type in ('multiple-choice', 'student-produced-response'));

drop index if exists questions_source_question_id_key;

create unique index questions_source_question_id_key
on public.questions (source_question_id);

create index if not exists questions_category_idx
on public.questions (category);

create index if not exists questions_question_type_idx
on public.questions (question_type);

create index if not exists questions_image_urls_idx
on public.questions using gin (image_urls);
bo 
