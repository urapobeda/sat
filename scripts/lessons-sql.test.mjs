import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const ids = Array.from({ length: 5 }, (_, i) => `00000000-0000-4000-8000-00000000000${i + 1}`);
const [teacherA, teacherB, admin, studentA, studentB] = ids;
const questions = ["00000000-0000-4000-9000-000000000001", "00000000-0000-4000-9000-000000000002"];
const migration = name => readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
const asUser = async id => { await db.exec("reset role; set role authenticated"); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); };
const asService = () => db.exec("reset role; set role service_role");
const items = [
  { part: "classwork", questionId: questions[1] },
  { part: "homework", title: "Instructions", body: "Show your work." },
  { part: "homework", questionId: questions[0] }
];
async function save(group, title = "Lesson 1", position = 1, id = null, content = items) {
  return scalar("select save_lesson($1,$2,$3,'math','Linear equations',null,$4,'Notes',$5::jsonb)", [id, group, title, position, JSON.stringify(content)]);
}
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now(), is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table profiles(id uuid primary key references auth.users(id), full_name text, email text, created_at timestamptz default now());
    alter table profiles enable row level security;
    create policy own_profile on profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
    grant usage on schema public, auth to authenticated, anon, service_role;
    grant select,insert,update on profiles to authenticated;
    create table questions(id uuid primary key, section text, topic text, difficulty text, question text default '', choices jsonb default '[]', question_type text default 'multiple-choice');
    grant select on questions to anon,authenticated;
    create table question_solutions(question_id uuid primary key references questions(id),correct_answer text,explanation text default '');
    create table exam_papers(id uuid primary key,slug text,title text,is_published boolean default true);
    create table exam_modules(paper_id uuid references exam_papers(id),question_count integer);
    grant select on exam_papers,exam_modules to anon,authenticated;
  `);
  await db.exec(await migration("add_roles"));
  for (const [index, id] of ids.entries()) {
    await db.query("insert into auth.users(id,email) values($1,$2)", [id, `fixture-${index}@example.invalid`]);
    await db.query("insert into profiles(id,full_name,role) values($1,$2,$3)", [id, `Fixture ${index}`, index < 2 ? "teacher" : index === 2 ? "admin" : "student"]);
  }
  for (const id of questions) await db.query("insert into questions(id) values($1)", [id]);
  for (const name of ["add_groups", "add_assignments", "add_assignment_feedback"]) await db.exec(await migration(name));
  await assert.rejects(db.exec(await migration("add_lessons")), /Apply the existing assignment feedback and harden_homework/);
  await db.exec("rollback");
  assert.equal(await scalar("select to_regclass('public.lessons')"), null, "missing prerequisites fail before changing the schema");
  for (const name of ["harden_homework", "add_lessons", "add_lessons"]) await db.exec(await migration(name));
  await asUser(teacherA); const groupA = await scalar("select create_group('Group A')");
  await asUser(teacherB); const groupB = await scalar("select create_group('Group B')");
  await asService();
  const codeA = await scalar("select join_code from groups where id=$1", [groupA]);
  const codeB = await scalar("select join_code from groups where id=$1", [groupB]);
  await asUser(studentA); await db.query("select join_group_by_code($1)", [codeA]);
  await asUser(studentB); await db.query("select join_group_by_code($1)", [codeB]);
  await asUser(teacherA);
  const lessonA = await save(groupA, "Later lesson", 2);
  const firstA = await save(groupA, "First lesson", 1);
  await db.query("update lessons set starts_at='2026-12-10T10:00:00Z' where id=$1", [lessonA]);
  assert.deepEqual((await db.query("select id from list_my_lessons(null,true)")).rows.map(row => row.id), [lessonA], "schedule excludes undated lessons");
  assert.deepEqual((await db.query("select id from list_my_lessons() order by position")).rows.map(row => row.id), [firstA, lessonA]);
  const assignment = (await db.query("select * from assign_lesson_part($1,'homework',null,'Extra instructions',$2)", [lessonA, "00000000-0000-4000-8000-000000000010"])).rows[0];
  assert.equal(assignment.student_count, 1);
  assert.equal((await db.query("select * from assign_lesson_part($1,'homework',null,'Extra instructions',$2)", [lessonA, "00000000-0000-4000-8000-000000000010"])).rows[0].id, assignment.id);
  assert.equal(await scalar("select count(*)::int from assignments where lesson_id=$1", [lessonA]), 1);
  const assigned = (await db.query("select * from assignments where id=$1", [assignment.id])).rows[0];
  assert.equal(assigned.due_at, null); assert.equal(assigned.published, true); assert.equal(assigned.kind, "question_set");
  assert.equal(assigned.instructions, "Instructions\nShow your work.\n\nExtra instructions");
  assert.equal(await scalar("select question_id from assignment_questions where assignment_id=$1", [assignment.id]), questions[0]);
  await save(groupA, "Edited", 2, lessonA, [{ part: "homework", questionId: questions[1] }]);
  assert.equal(await scalar("select question_id from assignment_questions where assignment_id=$1", [assignment.id]), questions[0], "issued homework keeps its question snapshot");
  await assert.rejects(db.query("select * from assign_lesson_part($1,'classwork',null,'',$2)", [lessonA, "00000000-0000-4000-8000-000000000011"]), /1 to 100/);
  await assert.rejects(save(groupA, "Invalid", 1, null, [{ part: "homework", questionId: questions[0] }, { part: "homework", questionId: questions[0] }]), /duplicate key/);
  assert.equal(await scalar("select count(*)::int from lessons where title='Invalid'"), 0, "invalid item replacement rolls back the whole lesson");
  await asUser(teacherB);
  const lessonB = await save(groupB);
  assert.equal((await db.query("select * from lessons where id=$1", [lessonA])).rows.length, 0);
  assert.equal((await db.query("select * from lesson_items where lesson_id=$1", [lessonA])).rows.length, 0);
  await assert.rejects(save(groupA), /Lesson unavailable/);
  await assert.rejects(db.query("select * from assign_lesson_part($1,'homework',null,'',$2)", [lessonA, "00000000-0000-4000-8000-000000000012"]), /Lesson unavailable/);
  await assert.rejects(db.query("insert into lesson_items(lesson_id,part,position,question_id) values($1,'homework',99,$2)", [lessonA, questions[0]]), /row-level security/);
  await asUser(studentA);
  assert.equal((await db.query("select * from lessons where id=$1", [lessonB])).rows.length, 0);
  assert.equal((await db.query("select * from list_my_lessons()")).rows.length, 2);
  assert.equal((await db.query("select * from list_my_lesson_assignments()")).rows[0].status, null);
  await assert.rejects(save(groupA), /Lesson unavailable/);
  await assert.rejects(db.query("insert into lesson_items(lesson_id,part,position,question_id) values($1,'homework',99,$2)", [lessonA, questions[0]]), /row-level security/);
  assert.equal((await db.query("update lessons set title='Tampered' where id=$1 returning id", [lessonA])).rows.length, 0);
  await assert.rejects(db.query("select * from question_solutions"), /permission denied/);
  await asService();
  const attempt = await scalar("select start_assignment_attempt($1,$2)", [studentA, assignment.id]);
  await db.query("select save_verified_assignment_answer($1,$2,$3,'A',true,12)", [studentA, attempt, questions[0]]);
  await db.query("select finalize_assignment_submission($1,$2)", [studentA, attempt]);
  await asUser(studentA);
  assert.equal((await db.query("select * from list_my_lesson_assignments()")).rows[0].status, "submitted");
  await asUser(teacherA);
  await db.query("update assignments set max_attempts=2 where id=$1", [assignment.id]);
  const copy = await scalar("select duplicate_assignment($1)", [assignment.id]);
  const copied = (await db.query("select lesson_id,lesson_part,published,lesson_request_id,due_at from assignments where id=$1", [copy])).rows[0];
  assert.deepEqual(copied, { lesson_id: lessonA, lesson_part: "homework", published: false, lesson_request_id: null, due_at: null });
  await assert.rejects(db.query("update assignments set lesson_id=$1 where id=$2", [firstA, assignment.id]), /Students have started/);
  await assert.rejects(db.query("update assignments set lesson_id=$1 where id=$2", [lessonB, assignment.id]), /lesson must belong/);
  await asService();
  assert.equal(await scalar("select question_in_pending_homework($1,$2)", [studentA, questions[0]]), true, "no deadline does not release answers while a retake remains");
  assert.equal(await scalar("select assignment_answers_released($1,$2)", [assignment.id, studentA]), false);
  assert.equal(await scalar("select has_table_privilege('service_role','lessons','select')"), true);
  await asUser(admin); assert.equal((await db.query("select * from list_my_lessons()")).rows.length, 3);
  await db.exec("reset role"); await db.exec(await migration("add_lessons"));
  await db.exec(await readFile(new URL("../supabase/verify-lessons.sql", import.meta.url), "utf8"));
  assert.equal(await scalar("select count(*)::int from assignment_answers"), 1, "repeat migration keeps existing student answers");
  await db.exec("set role anon"); await assert.rejects(db.query("select * from lessons"), /permission denied/);
  console.log("Lesson SQL tests passed (repeat migration, RLS isolation, staff-only writes, atomic assignment, retries, snapshots, no-deadline retakes and preserved results)");
} catch (error) {
  console.error(error.message, error.code ?? "", error.where ?? "", error.stack?.split("\n").slice(1, 4).join("\n") ?? "");
  process.exitCode = 1;
} finally { await db.close(); }
