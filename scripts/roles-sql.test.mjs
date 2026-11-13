import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(process.env.PGLITE_PATH ? pathToFileURL(process.env.PGLITE_PATH).href : "@electric-sql/pglite");
const db = new PGlite();
const student = "00000000-0000-4000-8000-000000000001";
const teacher = "00000000-0000-4000-8000-000000000002";
const admin = "00000000-0000-4000-8000-000000000003";
const missing = "00000000-0000-4000-8000-000000000004";
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now(), is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.profiles(id uuid primary key references auth.users(id), full_name text, email text, created_at timestamptz default now());
    alter table profiles enable row level security;
    create policy own_profile on profiles for all to authenticated using (id=auth.uid()) with check (id=auth.uid());
    grant usage on schema auth, public to authenticated, anon, service_role;
    grant select, insert, update on profiles to authenticated, service_role;
  `);
  for (const [id, email] of [[student, "student@example.com"], [teacher, "teacher@example.com"], [admin, "admin@example.com"], [missing, "missing@example.com"]]) {
    await db.query("insert into auth.users(id,email) values($1,$2)", [id, email]);
  }
  await db.query("insert into profiles(id) values($1),($2),($3)", [student, teacher, admin]);
  const sql = await readFile(new URL("../supabase/migrations/add_roles.sql", import.meta.url), "utf8");
  await db.exec(sql);
  await db.query("update profiles set role='teacher' where id=$1", [teacher]);
  await db.query("update profiles set role='admin' where id=$1", [admin]);
  await db.exec(sql);
  assert.equal((await db.query("select role from profiles where id=$1", [teacher])).rows[0].role, "teacher");
  async function asUser(id) {
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  }
  await asUser(student);
  assert.equal((await db.query("select current_user_role() as role, is_staff() as staff")).rows[0].role, "student");
  assert.equal((await db.query("select is_staff() as staff")).rows[0].staff, false);
  await db.query("update profiles set full_name='Updated name' where id=$1", [student]);
  await db.query("select set_config('request.jwt.claim.role','service_role',false)");
  await assert.rejects(db.query("update profiles set role='admin' where id=$1", [student]), /Role changes require/);
  await assert.rejects(db.query("insert into profiles(id,role) values($1,'teacher') on conflict(id) do update set role=excluded.role", [student]), /Role changes require/);
  assert.equal((await db.query("select * from profiles where id=$1", [admin])).rows.length, 0);
  await assert.rejects(db.query("select admin_set_user_role($1,$2,'admin')", [student, student]), /permission denied/);
  await assert.rejects(db.query("select * from admin_list_users('',0)"), /permission denied/);
  await asUser(missing);
  await assert.rejects(db.query("insert into profiles(id,role) values($1,'admin')", [missing]), /Role changes require/);
  await db.query("insert into profiles(id) values($1)", [missing]);
  await db.query("update profiles set full_name='Normal profile' where id=$1", [missing]);
  await asUser(teacher);
  assert.equal((await db.query("select is_staff() as staff")).rows[0].staff, true);
  await assert.rejects(db.query("update profiles set role='admin' where id=$1", [teacher]), /Role changes require/);
  await db.exec("reset role; set role service_role");
  await db.query("select admin_set_user_role($1,$2,'teacher')", [admin, student]);
  await assert.rejects(db.query("select admin_set_user_role($1,$1,'student')", [admin]), /Cannot remove/);
  await assert.rejects(db.query("select admin_set_user_role($1,$2,'admin')", [teacher, student]), /Admin required/);
  assert.equal((await db.query("select * from admin_list_users('student@',0)")).rows.length, 1);
  assert.equal((await db.query("select * from admin_list_users('',0)")).rows.length, 4);
  await db.exec("reset role; set role anon");
  await assert.rejects(db.query("select * from admin_list_users('',0)"), /permission denied/);
  await assert.rejects(db.query("select admin_set_user_role($1,$2,'admin')", [student, student]), /permission denied/);
  console.log("Roles SQL tests passed (idempotency, RLS, direct update/insert/upsert protection, staff helpers and admin-only operations)");
} finally { await db.close(); }
