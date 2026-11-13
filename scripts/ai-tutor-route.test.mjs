import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const context = { z: require("zod").z, current: null };
globalThis.__satTutorTest = context;
const mock = `
export const z = globalThis.__satTutorTest.z;
export const AI_TUTOR_DAILY_LIMIT = 30;
export const NextResponse = { json: (data, init) => Response.json(data, init) };
export async function getAuthenticatedUserId() { return globalThis.__satTutorTest.current.user; }
export async function getQuestionPublicContext() { return { choices: [], question: 'Test', section: 'math', topic: 'algebra', difficulty: 'easy' }; }
export async function getQuestionSolution() { throw new Error('Unsubmitted answer must stay hidden'); }
export function getOpenAIModel() { return 'mock'; }
export function getOpenAIClient() { return { responses: { async create() {
  const c = globalThis.__satTutorTest.current;
  c.aiCalls++;
  if (c.aiFailure) throw new Error('Upstream failure');
  return { output_text: JSON.stringify({ title: 'Hint', message: 'Try factoring.', steps: [], followUpQuestion: null }) };
} } }; }
export function getSupabaseAdminClient() {
  const c = globalThis.__satTutorTest.current;
  return {
    async rpc(name, args) {
      c.reservations.push([name, args]);
      return { data: c.count, error: c.dbFailure ? { message: 'Unavailable' } : null };
    },
    from() { return {
      select() { return this; }, eq() { return this; }, not() { return this; }, in() { return this; },
      async limit() { return { data: [], error: null }; }
    }; }
  };
}
`;
const mockUrl = "data:text/javascript;base64," + Buffer.from(mock).toString("base64");
let source = await readFile(new URL("../app/api/ai-tutor/route.ts", import.meta.url), "utf8");
source = source.replace(/from "(next\/server|zod|@\/lib\/aiTutor|@\/lib\/server\/questionSolutions|@\/lib\/server\/auth|@\/lib\/supabase\/admin|@\/lib\/openai)"/g, `from "${mockUrl}"`);
const compiled = require("typescript").transpileModule(source, { compilerOptions: { module: 99, target: 9 } }).outputText;
const { POST } = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));
const user = "00000000-0000-4000-8000-000000000001";
async function run(overrides = {}, body = { action: "hint", contextType: "practice", questionId: user, message: "Help" }) {
  const c = context.current = { user, count: 1, reservations: [], aiCalls: 0, ...overrides };
  const response = await POST({ json: async () => body });
  return { ...c, response, payload: await response.json() };
}
try {
  const guest = await run({ user: null });
  assert.equal(guest.response.status, 401);
  assert.equal(guest.aiCalls, 0);
  assert.equal(guest.reservations.length, 0);
  const invalid = await run({}, {});
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.reservations.length, 0);
  const success = await run({ count: 30 });
  assert.equal(success.response.status, 200);
  assert.equal(success.aiCalls, 1);
  assert.deepEqual(success.reservations, [["consume_ai_tutor_usage", { p_user_id: user }]]);
  assert.deepEqual(success.payload.dailyUsage, { count: 30, limit: 30 });
  assert.equal(success.response.headers.has("set-cookie"), false);
  const exhausted = await run({ count: null });
  assert.equal(exhausted.response.status, 429);
  assert.equal(exhausted.aiCalls, 0);
  for (const config of [{ dbFailure: true }, { count: undefined }, { count: 31 }]) {
    const result = await run(config);
    assert.equal(result.response.status, 503);
    assert.equal(result.aiCalls, 0);
  }
  const failed = await run({ aiFailure: true });
  assert.equal(failed.response.status, 500);
  assert.equal(failed.reservations.length, 1);
  console.log("AI Tutor route tests passed (auth, quota, fail-closed behavior and hidden solutions)");
} finally {
  delete globalThis.__satTutorTest;
}
