import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const user = "00000000-0000-4000-8000-000000000001";
const attempt = "00000000-0000-4000-8000-000000000002";
const moduleId = "00000000-0000-4000-8000-000000000003";
const itemId = "00000000-0000-4000-8000-000000000004";
const state = { z: require("zod").z };
globalThis.__paperRouteTest = state;
const mock = `
 const state = globalThis.__paperRouteTest;
 export const z = state.z;
 export const NextResponse = { json: (data, init) => Response.json(data, init) };
 export const getAuthenticatedUserId = async () => state.user;
 export const loadPaperAttempt = async (user, id) => {
   state.snapshots.push([user,id]); return { completed: false, items: [{ id: "visible" }] };
 };
 export const gradePaperModule = async (module, answers) => {
   state.grades.push([module,answers]); return { [state.item]: true };
 };
 export const getSupabaseAdminClient = () => ({
   from(table) { return {
     select() { return this; },
     eq(key,value) { state.filters.push([table,key,value]); return this; },
     async maybeSingle() { return { data: table === "exam_attempts" ? state.attempt : state.current }; },
     async single() { return { data: state.run }; }
   }; },
   async rpc(name,args) { state.calls.push([name,args]); return { data: state.rpc.shift() }; }
 });
`;
const mockUrl = "data:text/javascript;base64," + Buffer.from(mock).toString("base64");
const source = (await readFile(new URL("../app/api/papers/attempts/route.ts", import.meta.url), "utf8"))
  .replace(/from "(next\/server|zod|@\/lib\/server\/auth|@\/lib\/server\/paperAttempts|@\/lib\/supabase\/admin)"/g, `from "${mockUrl}"`);
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { POST } = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));
async function call(payload = {}, overrides = {}) {
  Object.assign(state, {
    user, item: itemId, attempt: { id: attempt, current_module_id: moduleId }, current: { completed_at: null },
    run: { revision: 1, answers: { [itemId]: "B" } }, rpc: [true, true],
    calls: [], filters: [], grades: [], snapshots: [], ...overrides
  });
  const response = await POST({ json: async () => ({ action: "save", attemptId: attempt, moduleId, revision: 0, answers: { [itemId]: "B" }, flags: {}, index: 0, ...payload }) });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
try {
  assert.equal((await call({}, { user: null })).status, 401);
  assert.equal((await call({ revision: -1 })).status, 400);
  assert.equal((await call({}, { attempt: null })).status, 404);
  assert.equal(state.calls.length, 0);
  assert.equal(state.grades.length, 0);
  await call();
  assert(state.filters.some(([table,key,value]) => table === "exam_attempts" && key === "user_id" && value === user));
  assert.equal((await call({}, { rpc: [false] })).status, 409);
  assert.equal((await call({}, { attempt: { id: attempt, current_module_id: null } })).status, 409);
  const saved = await call();
  assert.equal(saved.status, 200);
  assert.equal(saved.headers.get("cache-control"), "no-store");
  assert.equal(state.grades.length, 0, "Saving does not fetch solutions");
  assert.equal(state.snapshots.length, 0, "Saving does not regenerate question images");
  assert.equal((await call({}, { current: { completed_at: "finished" } })).status, 409);
  const submitted = await call({ action: "submit" });
  assert.equal(submitted.status, 200);
  assert.deepEqual(state.grades, [[moduleId, { [itemId]: "B" }]]);
  assert.equal(state.calls[1][1].p_revision, 1);
  assert.equal(state.calls[1][1].p_submit, true);
  assert.equal((await call({ action: "submit" }, { rpc: [true,false] })).status, 409);
  assert.equal((await call({ action: "submit" }, { current: { completed_at: "finished" } })).status, 200);
  assert.equal(state.calls.length, 0, "Retrying a submitted module does not rescore it");
  assert.equal((await call({ action: "open", slug: "pdf-fixture", section: "full" }, { rpc: [attempt] })).status, 200);
  assert.equal(state.calls[0][1].p_user, user);
  assert.equal(state.grades.length, 0);
  console.log("Interactive paper route tests passed (authentication, ownership, validation, saves, conflicts, grading and idempotent submission)");
} finally {
  delete globalThis.__paperRouteTest;
}
