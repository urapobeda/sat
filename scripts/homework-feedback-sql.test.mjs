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
  console.log("Assignment feedback SQL tests passed (RLS, hidden correctness, comments, exact/idempotent retakes, serialized grading, monotonic time and preserved data)");
} catch (error) { console.error({ message: error.message, code: error.code, where: error.where }); process.exitCode = 1; } finally { await db.close(); }
