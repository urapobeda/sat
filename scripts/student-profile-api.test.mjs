import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  ts = require("typescript");
const id = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
const s = {
  z: require("zod").z,
  actor: { id, role: "student" },
  allowed: true,
  calls: [],
};
globalThis.__profileApi = s;
const mock = `const s=globalThis.__profileApi;
export const z=s.z;export const NextResponse={json:(v,i)=>Response.json(v,i)};
export const profileActor=async()=>s.actor?{actor:s.actor,db:{
 from(table){return {update(value){s.calls.push(['update',table,value]);return this;},insert(value){s.calls.push(['insert',table,value]);return this;},eq(k,v){s.calls.push(['eq',k,v]);return this;},select(){return this;},async single(){return {data:{id:s.actor.id},error:s.allowed?null:{message:'RLS'}};}};},
 storage:{from(){return {info:async()=>({error:null})};}}
}}:null;
export const studentProfile=async(db,id)=>{s.calls.push(['load',id]);if(!s.allowed)throw Error('Forbidden');return {profile:{id}};};`;
const url =
  "data:text/javascript;base64," + Buffer.from(mock).toString("base64");
async function load(path) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  source = source.replace(
    /from "(next\/server|zod|@\/lib\/server\/studentProfiles)"/g,
    `from "${url}"`,
  );
  return import(
    "data:text/javascript;base64," +
      Buffer.from(
        ts.transpileModule(source, {
          compilerOptions: { module: 99, target: 9 },
        }).outputText,
      ).toString("base64")
  );
}
const profile = await load("../app/api/profile/route.ts"),
  teacher = await load("../app/api/teacher/students/route.ts");
const request = (body = {}, query = "") => ({
  nextUrl: new URL("http://localhost/api/profile" + query),
  json: async () => body,
});
try {
  assert.equal((await profile.GET(request())).status, 200);
  assert.equal(
    (await profile.GET(request({}, "?studentId=" + other))).status,
    403,
  );
  assert.ok(!s.calls.some((c) => c[1] === other));
  assert.equal(
    (await teacher.POST(request({ studentId: other, body: "note" }))).status,
    403,
  );
  const value = {
    full_name: "Student",
    target_score: 1500,
    sat_date: "2026-12-05",
    school: "School",
    grade: "11",
    telegram: "@student",
    about: "About",
    avatar_url: null,
  };
  assert.equal(
    (await profile.PATCH(request({ ...value, role: "admin" }))).status,
    400,
  );
  assert.equal(
    (await profile.PATCH(request({ ...value, target_score: 1700 }))).status,
    400,
  );
  assert.equal(
    (await profile.PATCH(request({ ...value, avatar_url: other + "/a.png" })))
      .status,
    400,
  );
  assert.equal((await profile.PATCH(request(value))).status, 200);
  assert.deepEqual(s.calls.at(-1), ["eq", "id", id]);
  s.actor = { id, role: "teacher" };
  s.allowed = false;
  assert.equal(
    (await profile.GET(request({}, "?studentId=" + other))).status,
    403,
  );
  assert.equal(
    (await teacher.POST(request({ studentId: other, body: "note" }))).status,
    403,
  );
  s.allowed = true;
  assert.equal(
    (await teacher.POST(request({ studentId: other, body: "note" }))).status,
    201,
  );
  assert.equal(s.calls.findLast((c) => c[0] === "insert")[2].author_id, id);
  s.actor = null;
  assert.equal((await profile.GET(request())).status, 401);
  assert.equal((await profile.PATCH(request(value))).status, 401);
  console.log(
    "Profile API tests passed (identity, role spoofing, avatar ownership, field validation and teacher-note author)",
  );
} finally {
  delete globalThis.__profileApi;
}
