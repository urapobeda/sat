import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const modulePath = process.argv[2];
if (!modulePath) throw new Error("Pass the local @electric-sql/pglite dist/index.js path.");
const { PGlite } = await import(pathToFileURL(modulePath));
const db = new PGlite();
const paths = [
  "schema.sql",
  "repair-question-bank-access.sql",
  "migrations/secure_question_solutions.sql",
  "migrations/add_question_bank_import_metadata.sql",
  "migrations/add_practice_answer_time_tracking.sql",
  "question-bank-filters.sql",
  "study-plans.sql",
  "migrations/add_past_papers.sql",
  "fix-permissions.sql",
  "migrations/finalize_verified_tests.sql"
];
const uid = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const question = "00000000-0000-4000-8000-000000000003";
const session = "00000000-0000-4000-8000-000000000004";
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated;
  `);
  const sql = await Promise.all(paths.map(async (path) =>
    (await readFile(new URL(`../supabase/${path}`, import.meta.url), "utf8"))
      // gen_random_uuid is built in on the embedded PostgreSQL version.
      .replace(/create extension if not exists pgcrypto;/gi, "")
  ));
  await db.exec(sql[0]);
  await db.exec(`
    insert into auth.users values ('${uid}','one@example.test','{"full_name":"First Student"}'),
      ('${other}','two@example.test','{"full_name":"Other Student"}');
    insert into public.questions (id, section, topic, difficulty, question, choices, correct_answer, explanation)
      values ('${question}', 'math', 'Algebra', 'easy', 'Sample', '[]', '1', 'Fixture');
  `);
  await db.exec("set role anon");
  await assert.rejects(db.query("select correct_answer from public.questions"), { code: "42501" });
  await db.exec("reset role");
  for (const statement of sql.slice(1)) await db.exec(statement);
  for (const statement of sql.slice(1)) await db.exec(statement);
  const verify = await readFile(new URL("../supabase/verify-production-readiness.sql", import.meta.url), "utf8");
  await db.exec(verify);

  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${uid}';`);
  assert.deepEqual((await db.query("select full_name from public.profiles")).rows, [{ full_name: "First Student" }]);
  await db.query("insert into public.profiles(id, full_name) values ($1,'Overwrite') on conflict (id) do nothing", [uid]);
  assert.deepEqual((await db.query("select full_name from public.profiles")).rows, [{ full_name: "First Student" }]);
  await assert.rejects(db.query("select explanation from public.question_solutions"), { code: "42501" });
  await db.query("insert into public.question_marks(user_id,question_id) values ($1,$2)", [uid, question]);
  await assert.rejects(db.query("insert into public.question_marks(user_id,question_id) values ($1,$2)", [other, question]), { code: "42501" });
  await db.exec(`set request.jwt.claim.sub = '${other}';`);
  assert.equal((await db.query("select * from public.question_marks")).rows.length, 0);
  await db.exec(`set request.jwt.claim.sub = '${uid}';`);
  assert.equal((await db.query("select * from public.question_marks")).rows.length, 1);
  await db.query("insert into public.test_sessions(user_id,mode,total) values ($1,'full',1)", [uid]);
  await assert.rejects(db.query("update public.test_sessions set score = 100"), { code: "42501" });
  await assert.rejects(db.query("select correct_answer from public.test_answers"), { code: "42501" });
  const sqlFinalize = "select public.finalize_verified_test($1,$2,$3,$4,$5,$6,$7) as saved";
  const args = [session, uid, JSON.stringify([{ question_id: question, selected_answer: "1", correct_answer: "1", is_correct: true }]), 1600, 100, 1, 40];
  await assert.rejects(db.query(sqlFinalize, args), { code: "42501" });

  await db.exec(`reset role; insert into public.test_sessions(id,user_id,total) values ('${session}','${uid}',1);
    set role service_role;`);
  assert.equal((await db.query(sqlFinalize, [session, other, ...args.slice(2)])).rows[0].saved, false);
  const invalidAnswer = JSON.stringify([{ question_id: other, selected_answer: "1", correct_answer: "1", is_correct: true }]);
  await assert.rejects(db.query(sqlFinalize, [session, uid, invalidAnswer, ...args.slice(3)]), { code: "23503" });
  assert.equal((await db.query("select completed_at from public.test_sessions where id = $1", [session])).rows[0].completed_at, null);
  assert.equal((await db.query(sqlFinalize, args)).rows[0].saved, true);
  assert.equal((await db.query(sqlFinalize, args)).rows[0].saved, false);
  assert.deepEqual((await db.query("select score, time_spent_seconds from public.test_sessions where id = $1", [session])).rows, [{ score: 1, time_spent_seconds: 40 }]);
  await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${other}';`);
  assert.equal((await db.query("select question_id from public.test_answers")).rows.length, 0);
  console.log("database audit: migrations, profile, bookmarking, RLS, and atomic grading passed");
} finally {
  await db.close();
}
