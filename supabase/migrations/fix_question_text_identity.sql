begin;

alter table public.questions add column if not exists source_question_id text;

-- Imported question identity is the source ID. Different questions can have
-- identical stems (and different choices); long rich text cannot be a B-tree key.
create unique index if not exists questions_source_question_id_key
on public.questions (source_question_id);

-- Support installations where this name is a constraint as well as an index.
alter table public.questions drop constraint if exists questions_question_key;
drop index if exists public.questions_question_key;

-- Preserve idempotent demo seeds without indexing the full text. This does not
-- constrain imported questions, whose source_question_id is always present.
create unique index if not exists questions_legacy_question_key
on public.questions (md5(question)) where source_question_id is null;

commit;
