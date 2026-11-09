begin;

-- Refuse to install over legacy duplicates; preserve every historical result.
create unique index if not exists practice_answers_session_question_key
  on public.practice_answers (session_id, question_id);
create unique index if not exists test_answers_session_question_key
  on public.test_answers (test_session_id, question_id);

create or replace function public.finalize_verified_test(
  p_session uuid, p_user uuid, p_answers jsonb, p_estimate integer,
  p_percentage integer, p_score integer, p_seconds integer
) returns boolean
language plpgsql
set search_path = ''
as $$
declare
  expected_total integer;
begin
  select total into expected_total
  from public.test_sessions
  where id = p_session and user_id = p_user and completed_at is null
  for update;

  if not found or expected_total <> jsonb_array_length(p_answers) then
    return false;
  end if;

  insert into public.test_answers (
    test_session_id, user_id, question_id, selected_answer, correct_answer, is_correct
  )
  select p_session, p_user, answer.question_id, answer.selected_answer,
    case when answer.selected_answer is not null then answer.correct_answer end,
    case when answer.selected_answer is not null then answer.is_correct end
  from jsonb_to_recordset(p_answers) as answer(
    question_id uuid, selected_answer text, correct_answer text, is_correct boolean
  )
  on conflict (test_session_id, question_id) do nothing;

  -- Keep earlier answers intact. An identical retry may finalize a legacy partial write.
  if exists (
    select 1
    from jsonb_to_recordset(p_answers) as answer(
      question_id uuid, selected_answer text, correct_answer text, is_correct boolean
    )
    join public.test_answers as stored
      on stored.test_session_id = p_session and stored.question_id = answer.question_id
    where stored.user_id <> p_user
      or stored.selected_answer is distinct from answer.selected_answer
      or (answer.selected_answer is not null and
        (stored.correct_answer is distinct from answer.correct_answer
          or stored.is_correct is distinct from answer.is_correct))
  ) then
    raise exception 'Existing test answers conflict with this submission';
  end if;

  update public.test_sessions
  set completed_at = now(), estimated_sat_score = p_estimate,
      percentage = p_percentage, score = p_score, time_spent_seconds = p_seconds
  where id = p_session and user_id = p_user;

  return true;
end;
$$;

revoke all on function public.finalize_verified_test(uuid,uuid,jsonb,integer,integer,integer,integer)
  from public, anon, authenticated;
grant execute on function public.finalize_verified_test(uuid,uuid,jsonb,integer,integer,integer,integer)
  to service_role;

-- Supabase's server routes use a separate server-only role.
grant select, update on public.practice_sessions, public.test_sessions to service_role;
grant select, insert, update on public.practice_answers, public.test_answers to service_role;

-- Browser callers create empty sessions and read/delete their own history via RLS.
-- Grading fields and answer writes are reserved to the verified server routes.
revoke insert, update on public.practice_answers, public.test_answers from anon, authenticated;
revoke insert, update on public.practice_sessions, public.test_sessions from anon, authenticated;
grant insert (user_id, section, topic, difficulty, total) on public.practice_sessions to authenticated;
grant insert (user_id, mode, total) on public.test_sessions to authenticated;
-- Legacy skipped rows can contain answer keys. Keep them stored and restrict reads.
revoke select on public.test_answers from public, anon, authenticated;
revoke select (correct_answer) on public.test_answers from public, anon, authenticated;
grant select (id, test_session_id, user_id, question_id, selected_answer, is_correct, created_at)
  on public.test_answers to authenticated;

-- Keep owner checks effective even if a legacy permissive policy exists.
do $$
declare
  relation text;
  owner_key text;
begin
  foreach relation in array array['profiles', 'practice_sessions', 'practice_answers',
    'test_sessions', 'test_answers', 'study_plans', 'question_marks', 'exam_attempts',
    'exam_attempt_answers', 'paper_bookmarks']
  loop
    owner_key := case when relation = 'profiles' then 'id' else 'user_id' end;
    execute format('alter table public.%I enable row level security', relation);
    execute format('revoke all on public.%I from anon, public', relation);
    execute format('drop policy if exists audit_owner_guard on public.%I', relation);
    execute format('create policy audit_owner_guard on public.%I as restrictive
      for all to authenticated using (auth.uid() = %I) with check (auth.uid() = %I)',
      relation, owner_key, owner_key);
  end loop;
end $$;

notify pgrst, 'reload schema';
commit;
