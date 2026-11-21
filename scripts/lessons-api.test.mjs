import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { z } from "zod";
const id = "00000000-0000-4000-8000-000000000001", other = "00000000-0000-4000-8000-000000000002";
const state = { role: "teacher", calls: [], error: null, rows: [{ id, student_count: 2 }], z };
globalThis.__lessonTest = state;
const dataUrl = text => "data:text/javascript;base64," + Buffer.from(text).toString("base64");
const mock = dataUrl(`const s=globalThis.__lessonTest;
export const z=s.z;export const NextResponse={json:(v,i)=>Response.json(v,i)};
const db={rpc(name,args){s.calls.push({name,args});return {
  range:async(from,to)=>({data:from===0?s.rows:[],error:s.error}),
  then(resolve,reject){return Promise.resolve({data:s.rows,error:s.error}).then(resolve,reject);}
};}};
export const getGroupStaff=async()=>s.role&&s.role!=='student'?{actor:{id:'${id}',role:s.role},db}:null;
export const getApiRoleActor=async()=>s.role?{id:'${id}',role:s.role}:null;
export const getSupabaseUserClient=()=>db;`);
async function load(filename, helper) {
  let source = (await readFile(new URL(filename, import.meta.url), "utf8")).replace('import "server-only";', "");
  source = source.replace(/from "([^"]+)"/g, (_, name) => `from "${name === '@/lib/server/lessonAccess' ? helper : mock}"`);
  return dataUrl(ts.transpileModule(source, { compilerOptions: { module: 99, target: 9 } }).outputText);
}
const helper = await load("../lib/server/lessonAccess.ts");
const create = await import(await load("../app/api/teacher/lessons/route.ts", helper));
const update = await import(await load("../app/api/teacher/lessons/[lessonId]/route.ts", helper));
const assign = await import(await load("../app/api/teacher/lessons/[lessonId]/assign/route.ts", helper));
const list = await import(await load("../app/api/lessons/route.ts", helper));
const request = (body = {}, query = "") => ({ json: async () => body, headers: new Headers({ authorization: "Bearer fixture" }), nextUrl: new URL(`http://localhost/api/lessons${query}`) });
const context = { params: Promise.resolve({ lessonId: id }) };
const draft = { groupId: id, title: "Lesson 1", section: "math", topic: "Algebra", startsAt: null, position: 1, notes: "", items: [{ kind: "question", part: "homework", questionId: other }] };
try {
  for (const role of [null, "student"]) {
    state.role = role;
    assert.equal((await create.POST(request(draft))).status, 403);
    assert.equal((await update.PATCH(request(draft), context)).status, 403);
    assert.equal((await assign.POST(request({ part: "homework", dueAt: null, comment: "", requestId: other }), context)).status, 403);
  }
  assert.equal(state.calls.length, 0, "denied requests never reach the database");
  state.role = "teacher"; state.rows = id;
  assert.equal((await create.POST(request(draft))).status, 201);
  assert.deepEqual(state.calls.at(-1).args.p_items, [{ part: "homework", questionId: other }]);
  assert.equal(state.calls.at(-1).args.p_id, null);
  assert.equal((await update.PATCH(request(draft), context)).status, 200);
  assert.equal(state.calls.at(-1).args.p_id, id);
  assert.equal((await create.POST(request({ ...draft, items: [...draft.items, ...draft.items] }))).status, 400);
  assert.equal((await create.POST(request({ ...draft, startsAt: "yesterday" }))).status, 400);
  assert.equal((await create.POST(request({ ...draft, items: [{ kind: "text", part: "homework", title: "", body: "" }] }))).status, 400);
  state.rows = [{ id, student_count: 2 }];
  const result = await assign.POST(request({ part: "homework", dueAt: null, comment: "Practice", requestId: other, studentCount: 999 }), context);
  assert.deepEqual(await result.json(), { id, studentCount: 2 });
  assert.equal(state.calls.at(-1).args.p_due_at, null);
  assert.equal("studentCount" in state.calls.at(-1).args, false);
  state.error = { code: "42501" };
  assert.equal((await update.PATCH(request(draft), context)).status, 403);
  state.error = { code: "23514" };
  assert.equal((await create.POST(request(draft))).status, 400);
  state.error = null; state.role = "student"; state.rows = [];
  assert.equal((await list.GET(request({}, `?groupId=${id}&scheduled=1`))).status, 200);
  assert.deepEqual(state.calls.findLast(call => call.name === "list_my_lessons").args, { p_group_id: id, p_scheduled: true });
  assert.ok(state.calls.some(call => call.name === "refresh_my_assignment_deadlines"));
  assert.equal((await list.GET(request({}, "?groupId=invalid"))).status, 400);
  state.role = null; assert.equal((await list.GET(request())).status, 403);
  const helpers = await import(helper);
  let pages = 0;
  const rows = await helpers.allLessonRows(async from => { pages++; return { data: from === 0 ? Array(1000).fill(id) : [other], error: null }; });
  assert.equal(rows.length, 1001); assert.equal(pages, 2);
  console.log("Lesson API tests passed (staff guards, validation, RLS error mapping, server counts, no deadline, user-context reads and pagination)");
} finally { delete globalThis.__lessonTest; }
