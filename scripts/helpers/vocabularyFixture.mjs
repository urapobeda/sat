import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
export async function vocabularyFixture() {
  const db = new PGlite();
  const ids = Array.from({ length: 5 }, (_, i) => `00000000-0000-4000-8000-00000000000${i + 1}`);
  const [teacherA, teacherB, admin, studentA, studentB] = ids;
  const migration = name => readFile(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
  const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
  const asUser = async id => { await db.exec("reset role; set role authenticated"); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); };
  const asService = () => db.exec("reset role; set role service_role");
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now(), is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table profiles(id uuid primary key references auth.users(id),full_name text,email text,created_at timestamptz default now());
    alter table profiles enable row level security;
    create policy own_profile on profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
    grant usage on schema public,auth to authenticated,anon,service_role;
    grant select,insert,update on profiles to authenticated;
    create table questions(id uuid primary key,section text,topic text,difficulty text,question text default '',choices jsonb default '[]',question_type text default 'multiple-choice');
    grant select on questions to anon,authenticated;
    create table question_solutions(question_id uuid primary key references questions(id),correct_answer text,explanation text default '');
    create table exam_papers(id uuid primary key,slug text,title text,is_published boolean default true);
    create table exam_modules(paper_id uuid references exam_papers(id),question_count integer);
    grant select on exam_papers,exam_modules to anon,authenticated;
  `);
  await db.exec(await migration("add_roles"));
  for (const [i, id] of ids.entries()) {
    await db.query("insert into auth.users(id,email) values($1,$2)", [id, `fixture-${i}@example.invalid`]);
    await db.query("insert into profiles(id,full_name,role) values($1,$2,$3)", [id, `Fixture ${i}`, i < 2 ? "teacher" : i === 2 ? "admin" : "student"]);
  }
  for (const name of ["add_groups", "add_assignments", "add_assignment_feedback", "harden_homework", "add_lessons", "add_vocabulary"]) await db.exec(await migration(name));
  await asUser(teacherA); const groupA = await scalar("select create_group('Group A')");
  await asUser(teacherB); const groupB = await scalar("select create_group('Group B')");
  await asService();
  const codeA = await scalar("select join_code from groups where id=$1", [groupA]);
  const codeB = await scalar("select join_code from groups where id=$1", [groupB]);
  await asUser(studentA); await db.query("select join_group_by_code($1)", [codeA]);
  await asUser(studentB); await db.query("select join_group_by_code($1)", [codeB]);
  return { db, scalar, asUser, asService, migration, teacherA, teacherB, admin, studentA, studentB, groupA, groupB };
}
