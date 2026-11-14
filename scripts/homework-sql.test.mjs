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

  // max_attempts is enforced once the only attempt has been submitted.
  await assert.rejects(db.query("select start_assignment_attempt($1,$2)", [studentA, assignmentId]), /No attempts remaining/);

  // Teachers only see their own groups' rosters; a stranger teacher is rejected, not given empty data silently.
  await asUser(teacherA);
  const roster = (await db.query("select * from get_assignment_roster($1)", [assignmentId])).rows;
  assert.equal(roster.length, 1);
  assert.equal(roster[0].status, "submitted");
  assert.equal(Number(roster[0].correct_count), 1);
  await asUser(teacherB);
  await assert.rejects(db.query("select * from get_assignment_roster($1)", [assignmentId]), /Assignment unavailable/);
  assert.equal((await db.query("select * from list_teacher_assignments()")).rows.length, 0);

  await asUser(teacherA);
  const teacherList = (await db.query("select * from list_teacher_assignments()")).rows;
  assert.equal(teacherList.length, 1);
  assert.equal(Number(teacherList[0].submitted_count), 1);

  // Deletion is blocked once a submission exists, even for the owning teacher.
  assert.equal((await db.query("delete from assignments where id=$1 returning id", [assignmentId])).rows.length, 0);
  await asService();
  await db.query("delete from assignment_answers where submission_id=$1", [submissionId]);
  await db.query("delete from assignment_submissions where id=$1", [submissionId]);
  await asUser(teacherA);
  assert.equal((await db.query("delete from assignments where id=$1 returning id", [assignmentId])).rows.length, 1);

  // Admin sees everything; plain teachers do not.
  await asUser(admin);
  const assignmentId2 = (
    await db.query(
      "insert into assignments(group_id,created_by,title,kind,due_at) values($1,$2,'HW2','question_set',now()+interval '7 days') returning id",
      [groupB, admin]
    )
  ).rows[0].id;
  await db.query("select set_assignment_questions($1,$2)", [assignmentId2, questionIds]);
  assert.equal((await db.query("select * from list_teacher_assignments()")).rows.length, 1);
  await asUser(teacherA);
  assert.equal((await db.query("select * from list_teacher_assignments()")).rows.length, 0);

  // Service role retains full access to every new table (needed by the grading API routes).
  await asService();
  for (const table of ["assignments", "assignment_questions", "assignment_submissions", "assignment_answers"]) {
    for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      assert.equal(
        (await db.query("select has_table_privilege('service_role', $1, $2) as allowed", [table, privilege])).rows[0].allowed,
        true
      );
    }
  }

  await asSuperuser();
  await db.exec(migration);
  assert.equal(Number((await db.query("select count(*) as total from assignments")).rows[0].total), 1);
  console.log(
    "Homework SQL tests passed (draft/publish gating, group isolation, no student write path to grading, " +
      "max_attempts, roster/teacher isolation, delete-after-submission guard, admin visibility, service_role grants)"
  );
} finally {
  await db.close();
}
