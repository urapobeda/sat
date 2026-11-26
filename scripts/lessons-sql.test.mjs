import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(process.env.PGLITE_PATH ? pathToFileURL(process.env.PGLITE_PATH).href : "@electric-sql/pglite");
const db = new PGlite();
const ids = Array.from({ length: 5 }, (_, i) => `00000000-0000-4000-8000-00000000000${i + 1}`);
const [teacherA, teacherB, admin, studentA, studentB] = ids;
const read = (name) => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");
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
  `);
  await db.exec(await read("add_roles.sql"));
  for (const [i, id] of ids.entries()) {
    await db.query("insert into auth.users(id,email) values($1,$2)", [id, `fixture-${i}@example.com`]);
    await db.query("insert into profiles(id,full_name,role) values($1,$2,$3)", [id, `User ${i}`, i < 2 ? "teacher" : i === 2 ? "admin" : "student"]);
  }
  await db.exec(await read("add_groups.sql"));
  const migration = await read("add_lessons_and_materials.sql");
  await db.exec(migration);
  await db.exec(migration); // must be rerunnable

  const asUser = async (id) => {
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  };
  const one = async (sql, params) => (await db.query(sql, params)).rows[0];
  const count = async (sql, params) => (await db.query(sql, params)).rows.length;

  await asUser(teacherA);
  const groupA = (await one("select create_group('SAT A') as id")).id;
  const codeA = (await one("select join_code from groups where id=$1", [groupA])).join_code;
  await asUser(teacherB);
  const groupB = (await one("select create_group('SAT B') as id")).id;
  await asUser(studentA);
  await db.query("select join_group_by_code($1)", [codeA]);

  // teacher A schedules a lesson and attaches a material
  await asUser(teacherA);
  const lesson = await one(
    "insert into group_lessons(group_id,title,starts_at,meeting_url) values($1,'Inferences',now()+interval '1 day','https://meet.google.com/abc-defg-hij') returning *",
    [groupA]
  );
  assert.equal(lesson.created_by, teacherA);
  assert.equal(lesson.duration_minutes, 90);
  const material = await one(
    "insert into group_materials(group_id,lesson_id,title,url,kind) values($1,$2,'Конспект','https://docs.google.com/x','doc') returning *",
    [groupA, lesson.id]
  );
  assert.equal(material.created_by, teacherA);
  await db.query("update group_lessons set recording_url='https://youtu.be/xyz' where id=$1", [lesson.id]);
  assert.ok((await one("select updated_at from group_lessons where id=$1", [lesson.id])).updated_at >= lesson.updated_at);

  // validation
  await assert.rejects(db.query("insert into group_lessons(group_id,title,starts_at,meeting_url) values($1,'x',now(),'http://insecure.test')", [groupA]), /check constraint/);
  await assert.rejects(db.query("insert into group_lessons(group_id,title,starts_at,duration_minutes) values($1,'x',now(),5)", [groupA]), /check constraint/);
  await assert.rejects(db.query("insert into group_materials(group_id,title,url) values($1,'x','javascript:alert(1)')", [groupA]), /check constraint/);
  await assert.rejects(db.query("insert into group_lessons(group_id,title,starts_at,created_by) values($1,'x',now(),$2)", [groupA, teacherB]), /permission denied/);

  // teacher B cannot see or touch group A, nor write into it
  await asUser(teacherB);
  assert.equal(await count("select * from group_lessons"), 0);
  assert.equal(await count("select * from group_materials"), 0);
  await assert.rejects(db.query("insert into group_lessons(group_id,title,starts_at) values($1,'x',now())", [groupA]), /row-level security/);
  assert.equal(await count("update group_lessons set title='hacked' where id=$1 returning id", [lesson.id]), 0);
  assert.equal(await count("delete from group_materials where id=$1 returning id", [material.id]), 0);
  const lessonB = await one("insert into group_lessons(group_id,title,starts_at) values($1,'B lesson',now()) returning id", [groupB]);
  // a material cannot point at another group's lesson
  await asUser(teacherA);
  await assert.rejects(db.query("insert into group_materials(group_id,lesson_id,title,url) values($1,$2,'x','https://a.test')", [groupA, lessonB.id]), /another group|row-level security/);

  // student A (member of A) reads A only and cannot write
  await asUser(studentA);
  assert.equal(await count("select * from group_lessons"), 1);
  assert.equal(await count("select * from group_materials"), 1);
  await assert.rejects(db.query("insert into group_lessons(group_id,title,starts_at) values($1,'x',now())", [groupA]), /row-level security/);
  assert.equal(await count("update group_lessons set title='x' where id=$1 returning id", [lesson.id]), 0);
  assert.equal(await count("delete from group_lessons where id=$1 returning id", [lesson.id]), 0);

  // student B (no group) sees nothing
  await asUser(studentB);
  assert.equal(await count("select * from group_lessons"), 0);
  assert.equal(await count("select * from group_materials"), 0);

  // admin manages every group
  await asUser(admin);
  assert.equal(await count("select * from group_lessons"), 2);
  await db.query("update group_lessons set title='Admin edit' where id=$1", [lesson.id]);

  // deleting a lesson keeps its material, just unlinks it
  await asUser(teacherA);
  await db.query("delete from group_lessons where id=$1", [lesson.id]);
  assert.equal((await one("select lesson_id from group_materials where id=$1", [material.id])).lesson_id, null);

  await db.exec("reset role; set role anon");
  await assert.rejects(db.query("select * from group_lessons"), /permission denied/);
  await assert.rejects(db.query("select * from group_materials"), /permission denied/);
  await db.exec("reset role");
  console.log("Lessons SQL tests passed (staff-only writes, member-only reads, https links, cross-group lesson guard, rerunnable migration)");
} finally { await db.close(); }
