import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const id = "00000000-0000-4000-8000-000000000001";
const target = "00000000-0000-4000-8000-000000000002";
const context = { z: require("zod").z, role: "teacher", owned: true, calls: [] };
globalThis.__satGroupsTest = context;
const mock = `
const c = globalThis.__satGroupsTest;
export const z = c.z;
export const NextResponse = { json: (body, init) => Response.json(body, init) };
export async function getApiRoleActor() { return c.role ? { id: '${id}', role: c.role } : null; }
export function getSupabaseUserClient() { return {
  async rpc(name, args) {
    c.calls.push([name,args]);
    if (name === 'create_group') return { data: '${id}', error: null };
    if (name === 'list_my_groups') return { data: c.owned ? [{ id: '${id}', name: 'Fixture' }] : [], error: null };
    if (name === 'rotate_group_code') return { data: c.owned ? 'ABCD2345' : null, error: c.owned ? null : { code: '42501' } };
    return { data: [], error: null };
  },
  from(table) { c.calls.push(['table',table]); return {
    update(patch) { c.calls.push(['update',patch]); return this; }, delete() { return this; },
    eq(key,value) { c.calls.push(['eq',key,value]); return this; }, select() { return this; },
    async maybeSingle() { return { data: c.owned ? { id: '${id}' } : null, error: null }; },
    then(resolve) { resolve({ error: null }); }
  }; }
}; }
`;
const url = (s) => "data:text/javascript;base64," + Buffer.from(s).toString("base64");
const mockUrl = url(mock);
async function load(path, imports = {}) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  source = source.replace('import "server-only";', '').replace(/from "([^"]+)"/g, (_, name) => `from "${imports[name] ?? mockUrl}"`);
  return url(require("typescript").transpileModule(source, { compilerOptions: { module: 99, target: 9 } }).outputText);
}
try {
  const helper = await load("../lib/server/groupAccess.ts");
  const imports = { "@/lib/server/groupAccess": helper };
  const list = await import(await load("../app/api/teacher/groups/route.ts", imports));
  const detail = await import(await load("../app/api/teacher/groups/[groupId]/route.ts", imports));
  const teachers = await import(await load("../app/api/teacher/groups/teachers/route.ts", imports));
  const request = (body = {}) => ({ headers: new Headers({ authorization: "Bearer fixture-token" }), json: async () => body });
  const params = { params: Promise.resolve({ groupId: id }) };
  for (const role of [null, "student"]) {
    context.role = role;
    for (const action of [() => list.GET(request()), () => list.POST(request({ name: "Name" })), () => detail.GET(request(), params), () => detail.PATCH(request(), params), () => detail.DELETE(request(), params), () => teachers.GET(request())]) {
      assert.equal((await action()).status, 403);
    }
  }
  context.role = "teacher";
  assert.equal((await list.POST(request({ name: "  Class A  ", teacherId: target }))).status, 201);
  assert.deepEqual(context.calls.at(-1), ["create_group", { p_name: "Class A" }]);
  assert.equal((await list.POST(request({ name: " " }))).status, 400);
  assert.equal((await detail.PATCH(request({ action: "transfer", teacherId: target }), params)).status, 403);
  assert.equal((await teachers.GET(request())).status, 403);
  assert.equal((await detail.GET(request(), params)).status, 200);
  context.owned = false;
  assert.equal((await detail.GET(request(), params)).status, 404);
  assert.equal((await detail.PATCH(request({ action: "rename", name: "Other class" }), params)).status, 404);
  assert.equal((await detail.PATCH(request({ action: "rotate-code" }), params)).status, 403);
  assert.equal((await detail.DELETE(request({ studentId: target }), params)).status, 404);
  context.owned = true;
  context.role = "admin";
  assert.equal((await teachers.GET(request())).status, 200);
  assert.equal((await detail.PATCH(request({ action: "transfer", teacherId: target }), params)).status, 200);
  assert.ok(context.calls.some((call) => call[0] === "update" && call[1].teacher_id === target));
  assert.equal((await detail.DELETE(request({ studentId: target }), params)).status, 200);
  assert.ok(context.calls.some((call) => call[0] === "eq" && call[1] === "group_id" && call[2] === id));
  console.log("Group API tests passed (auth, staff checks, owner isolation, validated mutations, removal and admin-only transfer)");
} finally { delete globalThis.__satGroupsTest; }
