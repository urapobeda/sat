import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { PGlite } = await import(process.env.PGLITE_PATH ? pathToFileURL(process.env.PGLITE_PATH).href : "@electric-sql/pglite");
const db = new PGlite();
const user = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
  `);
  await db.query("insert into auth.users values ($1), ($2)", [user, other]);
  const migration = await readFile(new URL("../supabase/migrations/add_ai_tutor_usage.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec(migration);
  await db.query("insert into ai_tutor_usage values($1, (now() at time zone 'UTC')::date - 1, 30)", [user]);
  await db.exec("set role service_role");
  const results = await Promise.all(Array.from({ length: 45 }, () => db.query("select public.consume_ai_tutor_usage($1) as count", [user])));
  assert.deepEqual(results.map((r) => r.rows[0].count).filter((c) => c !== null).sort((a, b) => a - b), Array.from({ length: 30 }, (_, i) => i + 1));
  assert.equal((await db.query("select public.consume_ai_tutor_usage($1) as count", [other])).rows[0].count, 1);
  await db.exec("reset role; set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  const own = (await db.query("select * from ai_tutor_usage")).rows;
  assert.equal(own.length, 2);
  assert.ok(own.every((r) => r.user_id === user));
  for (const sql of ["select consume_ai_tutor_usage($1)", "update ai_tutor_usage set count=0 where user_id=$1", "delete from ai_tutor_usage where user_id=$1", "insert into ai_tutor_usage values($1,current_date+1,1)"]) {
    await assert.rejects(db.query(sql, [user]), /permission denied/);
  }
  await db.exec("reset role; set role anon");
  await assert.rejects(db.query("select * from ai_tutor_usage"), /permission denied/);
  await assert.rejects(db.query("select consume_ai_tutor_usage($1)", [user]), /permission denied/);
  await db.exec("reset role");
  assert.equal((await db.query("select count from ai_tutor_usage where user_id=$1 and date=(now() at time zone 'UTC')::date", [user])).rows[0].count, 30);
  await db.exec(migration);
  assert.equal((await db.query("select count from ai_tutor_usage where user_id=$1 and date=(now() at time zone 'UTC')::date", [user])).rows[0].count, 30);
  console.log("AI Tutor SQL tests passed (idempotency, atomic cap, new day, RLS, grants and isolation)");
} finally {
  await db.close();
}
