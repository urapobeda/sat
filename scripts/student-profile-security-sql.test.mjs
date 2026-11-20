import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(process.env.PGLITE_PATH ? pathToFileURL(process.env.PGLITE_PATH).href : "@electric-sql/pglite");
const db = new PGlite();
const ids = Array.from({ length: 5 }, (_, i) => `00000000-0000-4000-8000-00000000000${i + 1}`);
const [teacherA, teacherB, admin, studentA, studentB] = ids;
const questionIds = ["00000000-0000-4000-9000-000000000001", "00000000-0000-4000-9000-000000000002"];

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now(), is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.profiles(id uuid primary key references auth.users(id), full_name text, email text, created_at timestamptz default now());
    alter table profiles enable row level security;
    create policy own_profile on profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
    grant usage on schema public, auth to authenticated, anon, service_role;
    grant select, insert, update on profiles to authenticated;
    create table public.questions(id uuid primary key, section text, topic text, difficulty text, question text default '', choices jsonb default '[]', question_type text default 'multiple-choice');
    grant select on questions to anon, authenticated;
    create table public.question_solutions(question_id uuid primary key references questions(id), correct_answer text, explanation text default '');
    create table public.exam_papers(id uuid primary key, slug text, title text, is_published boolean default true);
    create table public.exam_modules(paper_id uuid references exam_papers(id), question_count integer);
    grant select on exam_papers, exam_modules to anon, authenticated;
  `);
  await db.exec(await readFile(new URL("../supabase/migrations/add_roles.sql", import.meta.url), "utf8"));
  for (const [i, id] of ids.entries()) {
    await db.query("insert into auth.users(id,email) values($1,$2)", [id, `fixture-${i}@example.com`]);
    await db.query("insert into profiles(id,full_name,role) values($1,$2,$3)", [id, `User ${i}`, i < 2 ? "teacher" : i === 2 ? "admin" : "student"]);
  }
  for (const id of questionIds) {
    await db.query("insert into questions(id,section,topic,difficulty) values($1,'math','Linear Functions','easy')", [id]);
    await db.query("insert into question_solutions(question_id,correct_answer) values($1,'A')", [id]);
  }
  await db.exec(await readFile(new URL("../supabase/migrations/add_groups.sql", import.meta.url), "utf8"));
  const migration = await readFile(new URL("../supabase/migrations/add_assignments.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec(migration);

  const asUser = async (id) => {
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  };
  const asService = async () => db.exec("reset role; set role service_role");
  const asSuperuser = async () => db.exec("reset role");

  await asUser(teacherA);
  const groupA = (await db.query("select create_group('Class A') as id")).rows[0].id;
  await asUser(teacherB);
  const groupB = (await db.query("select create_group('Class B') as id")).rows[0].id;

  await asService();
  const codeA = (await db.query("select join_code from groups where id=$1", [groupA])).rows[0].join_code;
  const codeB = (await db.query("select join_code from groups where id=$1", [groupB])).rows[0].join_code;

  await asUser(studentA);
  await db.query("select join_group_by_code($1)", [codeA]);
  await asUser(studentB);
  await db.query("select join_group_by_code($1)", [codeB]);

  // Draft assignment cannot be published without questions.
  await asUser(teacherA);
  const assignmentId = (
    await db.query(
      "insert into assignments(group_id,created_by,title,kind,due_at) values($1,$2,'HW1','question_set',now()+interval '7 days') returning id",
      [groupA, teacherA]
    )
  ).rows[0].id;
  await assert.rejects(db.query("update assignments set published=true where id=$1", [assignmentId]), /Add at least one question/);

  // A stranger teacher cannot touch this group's assignment.
  await asUser(teacherB);
  assert.equal((await db.query("select * from assignments where id=$1", [assignmentId])).rows.length, 0);
  await assert.rejects(
    db.query("select set_assignment_questions($1,$2)", [assignmentId, questionIds]),
    /Assignment unavailable/
  );

  await asUser(teacherA);
  await db.query("select set_assignment_questions($1,$2)", [assignmentId, questionIds]);
  await db.query("update assignments set published=true where id=$1", [assignmentId]);

  // Students only see published assignments in their own group; drafts and other groups never leak.
  await asUser(studentB);
  assert.equal((await db.query("select * from list_student_assignments()")).rows.length, 0);
  await asUser(studentA);
  const studentList = (await db.query("select * from list_student_assignments()")).rows;
  assert.equal(studentList.length, 1);
  assert.equal(studentList[0].status, null);

  // Direct REST-style writes to submissions/answers are impossible for students: no grant exists at all.
  await assert.rejects(
    db.query("insert into assignment_submissions(assignment_id,student_id,status) values($1,$2,'submitted')", [assignmentId, studentA]),
    /permission denied/
  );
  await assert.rejects(
    db.query("select start_assignment_attempt($1,$2)", [studentA, assignmentId]),
    /permission denied for function/
  );

  // The server (service_role) opens an attempt; it is idempotent/resumable.
  await asService();
  const submissionId = (await db.query("select start_assignment_attempt($1,$2) as id", [studentA, assignmentId])).rows[0].id;
  const resumed = (await db.query("select start_assignment_attempt($1,$2) as id", [studentA, assignmentId])).rows[0].id;
  assert.equal(resumed, submissionId);

  // A student still cannot forge correctness or submission status directly, even mid-attempt.
  await asUser(studentA);
  await assert.rejects(
    db.query("update assignment_submissions set status='submitted', correct_count=99 where id=$1", [submissionId]),
    /permission denied/
  );
  await assert.rejects(
    db.query("insert into assignment_answers(submission_id,question_id,answer,is_correct) values($1,$2,'A',true)", [submissionId, questionIds[0]]),
    /permission denied/
  );
  // Nor can they read another student's or a classmate's raw answers/results directly.
  await assert.rejects(db.query("select * from assignment_submissions"), /permission denied/);
  await assert.rejects(db.query("select * from assignment_answers"), /permission denied/);

  // Server-side grading and submission (service_role), exactly like the real API route would do.
  await asService();
  await db.query(
    "insert into assignment_answers(submission_id,question_id,answer,is_correct) values($1,$2,'A',true)",
    [submissionId, questionIds[0]]
  );
  await db.query(
    "update assignment_submissions set status='submitted', submitted_at=now(), correct_count=1, total_count=2 where id=$1",
    [submissionId]
  );

  const feedbackMigration = await readFile(new URL("../supabase/migrations/add_assignment_feedback.sql", import.meta.url), "utf8");
  await asSuperuser(); await db.exec(feedbackMigration); await db.exec(feedbackMigration);
  const foreignQuestion = "00000000-0000-4000-9000-000000000003";
  await db.query("insert into questions(id) values($1)", [foreignQuestion]);
  await asUser(teacherA);
  await assert.rejects(db.query("select set_assignment_questions($1,$2)",[assignmentId,questionIds]), /Cannot change questions/);
  const commentId = (await db.query("insert into assignment_feedback(submission_id,question_id,author_id,body) values($1,$2,$3,'Factor first') returning id", [submissionId, questionIds[0], teacherA])).rows[0].id;
  await db.query("insert into assignment_feedback(submission_id,author_id,body) values($1,$2,'Good work')", [submissionId, teacherA]);
  await assert.rejects(db.query("insert into assignment_feedback(submission_id,question_id,author_id,body) values($1,$2,$3,'Wrong question')", [submissionId, foreignQuestion, teacherA]), /row-level security/);
  await assert.rejects(db.query("insert into assignment_feedback(submission_id,author_id,body) values($1,$2,'Forged author')", [submissionId, teacherB]), /row-level security/);
  assert.equal((await db.query("select * from assignment_submissions")).rows.length, 1);
  assert.equal((await db.query("select * from assignment_answers")).rows.length, 1);
  assert.equal((await db.query("select * from get_assignment_report_rows($1)", [assignmentId])).rows[0].full_name, "User 3");
  await asUser(teacherB);
  assert.equal((await db.query("select * from assignment_submissions")).rows.length, 0);
  assert.equal((await db.query("select * from assignment_answers")).rows.length, 0);
  assert.equal((await db.query("select * from assignment_feedback")).rows.length, 0);
  await assert.rejects(db.query("select * from get_assignment_report_rows($1)", [assignmentId]), /Assignment unavailable/);
  await assert.rejects(db.query("select grant_assignment_retake($1)", [submissionId]), /Submission unavailable/);
  await asUser(studentB);
  for (const table of ["assignment_submissions","assignment_answers","assignment_feedback"]) assert.equal((await db.query("select * from " + table)).rows.length, 0);
  await asUser(studentA);
  assert.equal((await db.query("select * from assignment_feedback")).rows.length, 2);
  assert.equal((await db.query("select * from list_my_assignment_feedback()")).rows[0].submission_id, submissionId);
  await assert.rejects(db.query("insert into assignment_feedback(submission_id,author_id,body) values($1,$2,'Self feedback')", [submissionId,studentA]), /row-level security/);
  await assert.rejects(db.query("update assignment_feedback set body='Edited' where id=$1", [commentId]), /permission denied/);
  await assert.rejects(db.query("delete from assignment_feedback where id=$1", [commentId]), /permission denied/);
  await assert.rejects(db.query("select grant_assignment_retake($1)", [submissionId]), /Submission unavailable/);
  await asUser(teacherA);
  const grants = await Promise.all([db.query("select grant_assignment_retake($1) as n", [submissionId]), db.query("select grant_assignment_retake($1) as n", [submissionId])]);
  assert.ok(grants.every((result) => result.rows[0].n === 1));
  assert.equal((await db.query("select * from assignment_retake_grants")).rows.length, 1);
  await asUser(studentA);
  assert.equal((await db.query("select * from list_student_assignments()")).rows[0].max_attempts, 2);
  await asService();
  const next = (await db.query("select start_assignment_attempt($1,$2) as id", [studentA, assignmentId])).rows[0].id;
  assert.notEqual(next, submissionId);
  assert.equal((await db.query("select start_assignment_attempt($1,$2) as id", [studentA, assignmentId])).rows[0].id,next);
  await db.query("select save_verified_assignment_answer($1,$2,$3,'A',true,11)", [studentA,next,questionIds[0]]);
  await db.query("select save_verified_assignment_answer($1,$2,$3,'A',true,7)", [studentA,next,questionIds[0]]);
  assert.equal((await db.query("select time_spent_seconds from assignment_answers where submission_id=$1",[next])).rows[0].time_spent_seconds,11);
  await assert.rejects(db.query("select save_verified_assignment_answer($1,$2,$3,'A',true,1)", [studentB,next,questionIds[0]]), /Attempt unavailable/);
  await assert.rejects(db.query("select save_verified_assignment_answer($1,$2,$3,'A',true,1)", [studentA,next,foreignQuestion]), /Question unavailable/);
  await asUser(studentA);
  assert.equal((await db.query("select * from assignment_answers where submission_id=$1",[next])).rows.length,0,"No correctness leak during an attempt");
  await assert.rejects(db.query("select save_verified_assignment_answer($1,$2,$3,'A',true,1)", [studentA,next,questionIds[0]]), /permission denied/);
  await asUser(teacherA);
  assert.equal((await db.query("select * from assignment_answers where submission_id=$1",[next])).rows.length,1);
  await assert.rejects(db.query("select grant_assignment_retake($1)",[next]), /Submit the attempt first/);
  await db.query("update assignments set show_answers='never' where id=$1",[assignmentId]);
  await asUser(studentA);
  assert.equal((await db.query("select * from assignment_answers")).rows.length,0,"Never-reveal policy still holds for submitted answers");
  assert.equal((await db.query("select * from assignment_feedback")).rows.length,2,"Feedback remains readable without revealing answer keys");
  await asService();
  await db.query("select finalize_assignment_submission($1,$2)",[studentA,next]);
  const finalized=(await db.query("select * from assignment_submissions where id=$1",[next])).rows[0];
  assert.equal(finalized.correct_count,1); assert.equal(finalized.total_count,2);
  await db.query("select finalize_assignment_submission($1,$2)",[studentA,next]);
  assert.equal((await db.query("select submitted_at from assignment_submissions where id=$1",[next])).rows[0].submitted_at.getTime(),finalized.submitted_at.getTime());
  await assert.rejects(db.query("select save_verified_assignment_answer($1,$2,$3,'B',false,20)", [studentA,next,questionIds[0]]), /Attempt unavailable/);
  await assert.rejects(db.query("select start_assignment_attempt($1,$2)",[studentA,assignmentId]), /No attempts remaining/);
  await asUser(teacherA);
  await db.query("select grant_assignment_retake($1)",[submissionId]);
  assert.equal((await db.query("select count(*)::int as n from assignment_retake_grants")).rows[0].n,1,"Replaying an old grant never adds attempts");
  await asUser(admin);
  assert.equal((await db.query("select * from assignment_feedback")).rows.length,2);
  assert.equal((await db.query("select grant_assignment_retake($1) as n",[next])).rows[0].n,2);
  await asService();
  const third=(await db.query("select start_assignment_attempt($1,$2) as id",[studentA,assignmentId])).rows[0].id;
  assert.notEqual(third,next);
  for(const table of ["assignment_feedback","assignment_retake_grants"]) for(const privilege of ["SELECT","INSERT","UPDATE","DELETE"]) assert.equal((await db.query("select has_table_privilege('service_role',$1,$2) as ok",[table,privilege])).rows[0].ok,true);
  await asSuperuser(); await db.exec(feedbackMigration);
  assert.equal((await db.query("select count(*)::int as n from assignment_feedback")).rows[0].n,2);

  await asSuperuser();
  const hardening = await readFile(new URL("../supabase/migrations/harden_homework.sql", import.meta.url),"utf8");
  await db.exec(hardening); await db.exec(hardening);
  assert.equal((await db.query("select has_function_privilege('authenticated','assignment_has_submissions(uuid)','execute') ok")).rows[0].ok,false);
  await asUser(teacherA);
  const timed=(await db.query("select duplicate_assignment($1) id",[assignmentId])).rows[0].id;
  await db.query("update assignments set title='Timed', time_limit_minutes=1,max_attempts=2,show_answers='after_submit',due_at=now()+interval '1 day',published=true where id=$1",[timed]);
  assert.equal((await db.query("select count(*)::int n from assignment_questions where assignment_id=$1",[timed])).rows[0].n,2);
  await asUser(teacherB);await assert.rejects(db.query("select duplicate_assignment($1)",[timed]),/Assignment unavailable/);
  await asService();
  const attempt=(await db.query("select start_assignment_attempt($1,$2) id",[studentA,timed])).rows[0].id;
  assert.equal((await db.query("select question_in_pending_homework($1,$2) blocked",[studentA,questionIds[0]])).rows[0].blocked,true);
  await db.query("select save_verified_assignment_answer($1,$2,$3,'A',true,10)",[studentA,attempt,questionIds[0]]);
  await db.query("update assignment_submissions set started_at=now()-interval '85 seconds' where id=$1",[attempt]);
  await db.query("select save_verified_assignment_answer($1,$2,$3,'A',true,20)",[studentA,attempt,questionIds[0]]);
  assert.equal((await db.query("select time_spent_seconds from assignment_answers where submission_id=$1 and question_id=$2",[attempt,questionIds[0]])).rows[0].time_spent_seconds,20,'30-second grace accepts a save');
  await db.query("update assignment_submissions set started_at=now()-interval '91 seconds' where id=$1",[attempt]);
  await db.query("select save_verified_assignment_answer($1,$2,$3,'A',true,99)",[studentA,attempt,questionIds[1]]);
  let timedRow=(await db.query("select * from assignment_submissions where id=$1",[attempt])).rows[0];
  assert.equal(timedRow.status,'submitted');assert.equal(timedRow.correct_count,1);assert.equal(timedRow.total_count,2);
  assert.equal((await db.query("select count(*)::int n from assignment_answers where submission_id=$1",[attempt])).rows[0].n,1,'late answer rejected without rolling back automatic submission');
  assert.equal((await db.query("select assignment_answers_released($1,$2) ok",[timed,studentA])).rows[0].ok,false);
  await asUser(studentA);assert.equal((await db.query("select * from assignment_answers where submission_id=$1",[attempt])).rows.length,0);
  await asUser(teacherA);
  await assert.rejects(db.query("select assignment_has_submissions($1)",[timed]),/permission denied/);
  await assert.rejects(db.query("select set_assignment_questions($1,$2)",[timed,questionIds]),/Cannot change questions/);
  await assert.rejects(db.query("update assignments set time_limit_minutes=10 where id=$1",[timed]),/Students have started/);
  await assert.rejects(db.query("update assignments set kind='past_paper' where id=$1",[timed]));
  assert.equal((await db.query("delete from assignments where id=$1 returning id",[timed])).rows.length,0);
  const disposable=(await db.query("select duplicate_assignment($1) id",[timed])).rows[0].id;
  assert.equal((await db.query("delete from assignments where id=$1 returning id",[disposable])).rows.length,1,'deletion policy works without direct helper EXECUTE');
  await asService();
  const finalAttempt=(await db.query("select start_assignment_attempt($1,$2) id",[studentA,timed])).rows[0].id;
  assert.equal((await db.query("select assignment_answers_released($1,$2) ok",[timed,studentA])).rows[0].ok,false,'active last attempt cannot expose the previous answer key');
  await db.query("update assignment_submissions set started_at=now()-interval '91 seconds' where id=$1",[finalAttempt]);
  assert.equal((await db.query("select expire_assignment_attempt($1,$2) expired",[studentA,finalAttempt])).rows[0].expired,true);
  assert.equal((await db.query("select assignment_answers_released($1,$2) ok",[timed,studentA])).rows[0].ok,true);
  await db.query("select finalize_assignment_submission($1,$2)",[studentA,finalAttempt]);
  await asUser(studentA);assert.equal((await db.query("select * from assignment_answers where submission_id=$1",[attempt])).rows.length,1);
  await asUser(teacherA);
  const autoAssignment=(await db.query("select duplicate_assignment($1) id",[timed])).rows[0].id;
  await db.query("update assignments set published=true where id=$1",[autoAssignment]);
  await asService();
  const autoAttempt=(await db.query("select start_assignment_attempt($1,$2) id",[studentA,autoAssignment])).rows[0].id;
  await db.query("update assignment_submissions set started_at=now()-interval '91 seconds' where id=$1",[autoAttempt]);
  await asUser(teacherA);
  assert.equal((await db.query("select * from get_assignment_report_rows($1)",[autoAssignment])).rows[0].status,'submitted','opening teacher report expires old attempts');
  await asService();
  const nextAuto=(await db.query("select start_assignment_attempt($1,$2) id",[studentA,autoAssignment])).rows[0].id;
  await db.query("update assignment_submissions set started_at=now()-interval '91 seconds' where id=$1",[nextAuto]);
  await asUser(studentA);await db.query("select refresh_my_assignment_deadlines()");
  assert.equal((await db.query("select status from assignment_submissions where id=$1",[nextAuto])).rows[0].status,'submitted','opening homework list expires old attempts');
  await asSuperuser();
  // Minimal Supabase Storage fixture; bucket-size/MIME enforcement belongs to the Storage service.
  await db.exec(`create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array(regexp_replace($1,'/[^/]*$',''),'/') $$;
    grant usage on schema storage to authenticated,service_role;grant select,insert,update,delete on storage.objects to authenticated,service_role;`);
  for(const table of ['practice_sessions','practice_answers','test_sessions','test_answers','study_plans','exam_attempts']) {
    await db.exec(`create table public.${table}(id uuid primary key default gen_random_uuid(),user_id uuid references profiles(id));
      alter table public.${table} enable row level security;create policy own_data on public.${table} for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
      grant select,insert,update on public.${table} to authenticated;`);
    await db.query(`insert into public.${table}(user_id) values($1),($2)`,[studentA,studentB]);
  }

  await db.exec("alter table test_answers add column test_session_id uuid,add column question_id uuid,add column selected_answer text,add column is_correct boolean,add column created_at timestamptz,add column correct_answer text");
  for(const table of ['profiles','practice_sessions','practice_answers','test_sessions','test_answers','study_plans','exam_attempts']) {
    const key=table==='profiles'?'id':'user_id';
    await db.exec(`create policy audit_owner_guard on ${table} as restrictive for all to authenticated using(auth.uid()=${key}) with check(auth.uid()=${key})`);
  }
  await db.exec("create policy test_sessions_history_owner_guard on test_sessions as restrictive for select to authenticated using(auth.uid()=user_id)");
  await db.exec("create policy legacy_storage_all on storage.objects for all to authenticated using(true) with check(true)");
  const profileMigration=await readFile(new URL("../supabase/migrations/add_student_profile.sql",import.meta.url),'utf8');await db.exec(profileMigration);await db.exec(profileMigration);
  const bucket=(await db.query("select * from storage.buckets where id='avatars'")).rows[0];assert.equal(Number(bucket.file_size_limit),2097152);assert.equal(bucket.public,false);assert.ok(!bucket.allowed_mime_types.includes('image/svg+xml'));
  await asUser(teacherA);
  for(const table of ['practice_sessions','practice_answers','test_sessions','test_answers','study_plans','exam_attempts']) {
    const seen=(await db.query(`select user_id from ${table}`)).rows;assert.deepEqual(seen.map(r=>r.user_id),[studentA]);
    assert.equal((await db.query(`update ${table} set user_id=$1 where user_id=$1 returning id`,[studentA])).rows.length,0,'teacher SELECT does not grant UPDATE');
  }
  assert.equal((await db.query("select id from profiles where id=$1",[studentB])).rows.length,0);
  await db.query("insert into teacher_notes(student_id,author_id,body) values($1,$2,'Private note')",[studentA,teacherA]);
  await assert.rejects(db.query("insert into teacher_notes(student_id,author_id,body) values($1,$2,'Wrong group')",[studentB,teacherA]),/row-level security/);
  await asUser(studentA);
  await assert.rejects(db.query("select correct_answer from test_answers"),/permission denied/);
  assert.equal((await db.query("select * from teacher_notes")).rows.length,0);
  assert.equal((await db.query("select * from profiles where id=$1",[studentB])).rows.length,0);
  await assert.rejects(db.query("insert into teacher_notes(student_id,author_id,body) values($1,$1,'Self note')",[studentA]),/row-level security/);
  await db.query("update profiles set target_score=1500,school='School',about='About' where id=$1",[studentA]);
  await assert.rejects(db.query("update profiles set target_score=1700 where id=$1",[studentA]),/check constraint/);
  await assert.rejects(db.query("update profiles set role='admin' where id=$1",[studentA]),/role|Role/);
  await assert.rejects(db.query("select * from question_solutions"),/permission denied/);
  await db.query("insert into storage.objects(bucket_id,name) values('avatars',$1)",[studentA+'/photo.png']);
  await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('avatars',$1)",[studentB+'/photo.png']),/row-level security/);
  await asUser(teacherA);assert.equal((await db.query("select * from storage.objects")).rows.length,1);
  assert.equal((await db.query("delete from storage.objects where name=$1 returning id",[studentA+'/photo.png'])).rows.length,0,'a broad old Storage policy cannot allow staff to delete another avatar');
  await asUser(teacherB);assert.equal((await db.query("select * from teacher_notes")).rows.length,0);assert.equal((await db.query("select * from storage.objects")).rows.length,0);
  await asUser(admin);assert.equal((await db.query("select * from practice_sessions")).rows.length,2);
  await asSuperuser();
  await db.exec(await readFile(new URL('../supabase/verify-homework-profile.sql',import.meta.url),'utf8'));
  console.log('Homework hardening and student profile SQL tests passed (deadlines, auto-submit, frozen assignments, duplicate, answer embargo, revoked helper, RLS, notes, avatars and role guard)');
  console.log("Assignment feedback SQL tests passed (RLS, hidden correctness, comments, exact/idempotent retakes, serialized grading, monotonic time and preserved data)");
} catch (error) { console.error({ message: error.message, code: error.code, where: error.where }); process.exitCode = 1; } finally { await db.close(); }
