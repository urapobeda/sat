import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import * as roles from "../lib/roles.ts";
const require = createRequire(import.meta.url);
const context = { roles, z: require("zod").z, role: "student", calls: [], token: "verified-token", actorId: "00000000-0000-4000-8000-000000000001" };
globalThis.__satRoleTest = context;
const mock = `
const c = globalThis.__satRoleTest;
export const z = c.z;
export const canAccessArea = c.roles.canAccessArea;
export const isUserRole = c.roles.isUserRole;
export const getRoleAccessDecision = c.roles.getRoleAccessDecision;
export const NextResponse = { json: (data, init) => {
  const response = Response.json(data, init);
  response.cookies = { set(name, value, options) { c.lastCookie = { name, value, options }; } };
  return response;
}, redirect: (url) => Response.redirect(url), next: () => new Response(null, { status: 200 }) };
export async function cookies() { return { get: () => ({ value: c.token }) }; }
export function redirect(location) { throw new Error('REDIRECT:' + location); }
function createMockClient() { return {
  auth: { async getUser(token) { return token === c.token ? { data: { user: { id: c.actorId, is_anonymous: c.anonymous, user_metadata: { role: 'admin' } } }, error: null } : { data: { user: null }, error: {} }; } },
  from() { return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { role: c.role }, error: c.dbFailure ? {} : null }; } }; },
  async rpc(name, args) { c.calls.push([name, args]); return { data: [], error: null }; }
}; }
export function getSupabaseUserClient(token) {
  c.userClientToken = token;
  return createMockClient();
}
export function getSupabaseAdminClient() {
  return { ...createMockClient(), from() { throw new Error('permission denied for table profiles'); } };
}
export function logRoleDenial(reason, details) { (c.denials ??= []).push({ reason, details }); }
`;
const url = (s) => "data:text/javascript;base64," + Buffer.from(s).toString("base64");
const mockUrl = url(mock);
async function load(path, replacements = {}) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  source = source.replace('import "server-only";', '');
  source = source.replace(/from "([^"]+)"/g, (_, name) => `from "${replacements[name] ?? mockUrl}"`);
  return url(require("typescript").transpileModule(source, { compilerOptions: { module: 99, target: 9 } }).outputText);
}
try {
  const actorUrl = await load("../lib/server/roles.ts");
  const actors = await import(actorUrl);
  assert.equal(await actors.getVerifiedRoleActor("forged-token"), null);
  assert.equal((await actors.getVerifiedRoleActor(context.token)).role, "student", "Ignore editable user_metadata roles");
  assert.equal(context.userClientToken, context.token, "Read own role with the verified user JWT, not service_role grants");
  context.dbFailure = true;
  assert.equal(await actors.getVerifiedRoleActor(context.token), null);
  context.dbFailure = false;
  context.anonymous = true;
  assert.equal(await actors.getVerifiedRoleActor(context.token), null);
  context.anonymous = false;
  await assert.rejects(actors.requirePageRole("teacher"), /REDIRECT:\//);
  context.role = "teacher";
  assert.equal((await actors.requirePageRole("teacher")).role, "teacher");
  await assert.rejects(actors.requirePageRole("admin"), /REDIRECT:\//);
  context.role = "admin";
  assert.equal((await actors.requirePageRole("admin")).role, "admin");
  const api = await import(await load("../app/api/admin/users/route.ts", { "@/lib/server/roles": actorUrl }));
  const proxy = (await import(await load("../proxy.ts", { "@/lib/server/roles": actorUrl }))).proxy;
  const request = (path, body, token = context.token) => ({
    url: `http://localhost:3000${path}`, nextUrl: new URL(`http://localhost:3000${path}`),
    headers: new Headers(token ? { authorization: `Bearer ${token}` } : {}),
    cookies: { get: () => token ? { value: token } : undefined }, json: async () => body
  });
  for (const role of ["student", "teacher"]) {
    context.role = role;
    assert.equal((await api.GET(request("/api/admin/users"))).status, 403);
    assert.equal((await api.PATCH(request("/api/admin/users", {}))).status, 403);
    assert.equal((await proxy(request("/api/admin/future-endpoint"))).status, 403);
    assert.equal((await proxy(request("/admin/users"))).headers.get("location"), "http://localhost:3000/");
  }
  context.role = "admin";
  assert.equal((await api.GET(request("/api/admin/users?search=test"))).status, 200);
  assert.equal((await api.GET(request("/api/admin/users", null, "forged-token"))).status, 403);
  assert.equal((await api.PATCH(request("/api/admin/users", { userId: context.actorId, role: "student" }))).status, 403);
  assert.equal((await api.PATCH(request("/api/admin/users", { userId: context.actorId, role: "owner" }))).status, 400);
  const target = "00000000-0000-4000-8000-000000000002";
  assert.equal((await api.PATCH(request("/api/admin/users", { userId: target, role: "teacher", actorId: target }))).status, 200);
  assert.deepEqual(context.calls.at(-1), ["admin_set_user_role", { p_actor_id: context.actorId, p_user_id: target, p_role: "teacher" }]);
  assert.equal((await proxy(request("/teacher/groups"))).status, 200);
  assert.equal((await proxy(request("/admin/users"))).status, 200);
  const sessions = await import(await load("../app/api/auth/session/route.ts", { "@/lib/server/roles": actorUrl }));
  context.token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 1800 })).toString("base64url")}.signature`;
  assert.equal((await sessions.POST(request("/api/auth/session", null, "forged-token"))).status, 401);
  const validSession = request("/api/auth/session");
  validSession.headers.set("origin", "http://localhost:3000");
  assert.equal((await sessions.POST(validSession)).status, 200);
  assert.equal(context.lastCookie.name, "sat-hub-access");
  assert.equal(context.lastCookie.options.httpOnly, true);
  assert.equal(context.lastCookie.options.sameSite, "lax");
  assert.ok(context.lastCookie.options.maxAge > 0 && context.lastCookie.options.maxAge <= 1800);
  validSession.headers.set("origin", "https://untrusted.example");
  assert.equal((await sessions.POST(validSession)).status, 403);
  assert.equal((await sessions.DELETE(validSession)).status, 403);
  assert.equal((await sessions.DELETE(request("/api/auth/session"))).status, 200);
  assert.equal(context.lastCookie.options.maxAge, 0);
  context.token = `header.${Buffer.from(JSON.stringify({ exp: 1 })).toString("base64url")}.signature`;
  assert.equal((await sessions.POST(request("/api/auth/session"))).status, 401);
  assert.ok(context.denials.length > 0);
  assert.ok(!JSON.stringify(context.denials).includes(context.token));
  console.log("Server role tests passed (verified identity, metadata spoofing, page/API guards, self-demotion and secure session cookies)");
} finally { delete globalThis.__satRoleTest; }
