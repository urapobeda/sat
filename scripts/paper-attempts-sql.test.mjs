import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// PGLITE_PATH can point to an external installation to keep runtime dependencies unchanged.
const { PGlite } = await import(process.env.PGLITE_PATH ? pathToFileURL(process.env.PGLITE_PATH).href : "@electric-sql/pglite");
const db = new PGlite();
const user = "00000000-0000-4000-8000-000000000001";
const otherUser = "00000000-0000-4000-8000-000000000002";
const paper = "00000000-0000-4000-8000-000000000003";
const first = "00000000-0000-4000-8000-000000000004";
const second = "00000000-0000-4000-8000-000000000005";
const q1 = "00000000-0000-4000-8000-000000000006";
const q2 = "00000000-0000-4000-8000-000000000007";
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    create table storage.buckets(id text primary key, name text, public boolean, allowed_mime_types text[]);
    create table public.questions(id uuid primary key);
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    grant all on auth.users, storage.buckets to service_role;
  `);
  const baseline = (await readFile(new URL("../supabase/migrations/add_past_papers.sql", import.meta.url), "utf8"))
    .replace("create extension if not exists pgcrypto;", "");
  await db.exec(baseline);
  const migration = await readFile(new URL("../supabase/migrations/add_interactive_papers.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec(migration);
  await db.query("insert into auth.users values ($1),($2)", [user, otherUser]);
  await db.query(`insert into exam_papers(id,slug,title,paper_type,mode,difficulty,source_type,source_name,license_notes,is_published)
    values($1,'fixture','Test','full-length','linear','standard','original','Test','Test fixture',true)`, [paper]);
  for (const [id, number] of [[first, 1], [second, 2]]) {
    await db.query(`insert into exam_modules(id,paper_id,section,module_number,duration_seconds,question_count,sort_order)
      values($1,$2,'math',$3,300,1,$3)`, [id, paper, number]);
  }
  await db.query("insert into paper_items(id,module_id,position,question_type) values($1,$2,1,'multiple-choice'),($3,$4,1,'student-produced-response')", [q1, first, q2, second]);
  await db.query("insert into paper_solutions values($1,array['B']),($2,array['1/2','.5'])", [q1, q2]);
  await db.exec("set role service_role");
  const open = async (uid = user) => (await db.query("select open_paper_attempt($1,'fixture','full') as id", [uid])).rows[0].id;
  await assert.rejects(db.query("select open_paper_attempt($1,'fixture','reading-writing')", [user]), /Section unavailable/);
  const attempt = await open();
  assert.equal(await open(), attempt, "Refresh resumes the same attempt");
  const otherAttempt = await open(otherUser);
  assert.notEqual(otherAttempt, attempt);
  const action = async (overrides = {}) => {
    const p = { user, attempt, module: first, revision: 0, answers: { [q1]: "B" }, flags: { [q1]: true }, index: 0, submit: false, graded: {}, ...overrides };
    return (await db.query("select update_paper_attempt($1,$2,$3,$4,$5,$6,$7,$8,$9) as saved", [p.user, p.attempt, p.module, p.revision, JSON.stringify(p.answers), JSON.stringify(p.flags), p.index, p.submit, JSON.stringify(p.graded)])).rows[0].saved;
  };
  await assert.rejects(action({ user: otherUser }), /Attempt unavailable/);
  await assert.rejects(action({ module: second, answers: { [q2]: ".5" } }), /Module locked/);
  await assert.rejects(action({ answers: { [q2]: "B" } }), /Invalid answer/);
  assert.equal(await action(), true);
  assert.equal(await action(), false, "Stale saves cannot overwrite another device's draft");
  const saved = (await db.query("select * from paper_module_runs where attempt_id=$1 and module_id=$2", [attempt, first])).rows[0];
  assert.equal(saved.answers[q1], "B");
  assert.equal(saved.flags[q1], true);
  await db.query("update paper_module_runs set deadline=now()-interval '1 second' where attempt_id=$1 and module_id=$2", [attempt, first]);
  assert.equal(await action({ revision: 1, answers: { [q1]: "A" } }), true);
  assert.equal((await db.query("select answers from paper_module_runs where attempt_id=$1 and module_id=$2", [attempt, first])).rows[0].answers[q1], "B", "Expired answers are frozen");
  assert.equal(await action({ revision: 1, submit: true, graded: { [q1]: true } }), true);
  assert.equal(await action({ revision: 1, submit: true, graded: { [q1]: false } }), true, "Duplicate submission is idempotent");
  const ongoing = (await db.query("select * from exam_attempts where id=$1", [attempt])).rows[0];
  assert.equal(ongoing.current_module_id, second);
  assert.equal(ongoing.raw_score, 1);
  assert.equal(await action({ module: second, answers: { [q2]: ".5" }, flags: {} }), true);
  assert.equal(await action({ module: second, revision: 1, submit: true, graded: { [q2]: true } }), true);
  const completed = (await db.query("select * from exam_attempts where id=$1", [attempt])).rows[0];
  assert.equal(completed.status, "completed");
  assert.equal(completed.raw_score, 2);
  assert.equal(completed.current_module_id, null);
  await db.exec("reset role; set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  assert.equal((await db.query("select distinct attempt_id from paper_module_runs")).rows.length, 1);
  await assert.rejects(db.query("select * from paper_solutions"), /permission denied/);
  await assert.rejects(db.query("select graded from paper_module_runs"), /permission denied/);
  await assert.rejects(db.query("update exam_attempts set raw_score=999"), /permission denied/);
  await assert.rejects(db.query("select open_paper_attempt($1,'fixture','full')", [user]), /permission denied/);
  await db.exec("reset role; set role anon");
  await assert.rejects(db.query("select * from paper_module_runs"), /permission denied/);
  console.log("Interactive paper SQL tests passed (idempotent migrations, resume, isolation, revision conflicts, deadlines, module locks, submission, scoring, grants and RLS)");
} finally {
  await db.close();
}
