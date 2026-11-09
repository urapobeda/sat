import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const questionId = "00000000-0000-4000-8000-000000000002";
const skippedId = "00000000-0000-4000-8000-000000000003";
const sessionId = "00000000-0000-4000-8000-000000000004";
const owner = "00000000-0000-4000-8000-000000000005";
const state = { z: require("zod").z };
globalThis.__satTestCompletion = state;
const mock = `
  const state = globalThis.__satTestCompletion;
  export const z = state.z;
  export const NextResponse = { json: (data, init) => Response.json(data, init) };
  export const getAuthenticatedUserId = async () => state.user;
  export const loadGradingData = async (ids) => {
    state.gradingCalls++;
    return new Map(ids.map((id) => [id, { correctAnswer: "B" }]));
  };
  export const isAnswerCorrect = (grading, answer) => grading.correctAnswer === answer;
  export const getReviewQuestions = async (answers) => Object.keys(answers);
  export const getSupabaseAdminClient = () => ({
    from(table) { return {
      select() { return this; },
      eq(key, value) { state.filters.push([table,key,value]); return this; },
      async maybeSingle() { return { data: state.session }; }
    }; },
    async rpc(name, args) {
      state.rpcCalls.push([name,args]);
      return state.rpcResult;
    }
  });
`;
const mockUrl = "data:text/javascript;base64," + Buffer.from(mock).toString("base64");
const source = (await readFile(new URL("../app/api/tests/complete/route.ts", import.meta.url), "utf8"))
  .replace(/from "(next\/server|zod|@\/lib\/server\/auth|@\/lib\/server\/questionSolutions|@\/lib\/supabase\/admin)"/g, `from "${mockUrl}"`);
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { POST } = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));

async function submit({ user = owner, session = { total: 2, completed_at: null }, rpcResult = { data: true }, payload = {} } = {}) {
  Object.assign(state, { user, session, rpcResult, gradingCalls: 0, filters: [], rpcCalls: [] });
  const response = await POST({ json: async () => ({
    answers: { [questionId]: "B", [skippedId]: null },
    testSessionId: sessionId,
    timeSpentSeconds: 20,
    ...payload
  }) });
  return { status: response.status, body: await response.json() };
}

try {
  assert.equal((await submit({ user: null })).status, 401);
  assert.equal(state.gradingCalls, 0);
  assert.equal((await submit({ session: null })).status, 404);
  assert.deepEqual(state.filters, [["test_sessions", "id", sessionId], ["test_sessions", "user_id", owner]]);
  assert.equal(state.gradingCalls, 0);
  assert.equal((await submit({ session: { total: 2, completed_at: "already submitted" } })).status, 409);
  assert.equal((await submit({ payload: { answers: {} } })).status, 400);
  const valid = await submit();
  assert.equal(valid.status, 200);
  assert.equal(valid.body.score, 1);
  assert.equal(valid.body.total, 2);
  assert.deepEqual(valid.body.reviewQuestions, [questionId]);
  assert.equal(state.rpcCalls[0][0], "finalize_verified_test");
  assert.equal((await submit({ rpcResult: { data: false } })).status, 409);
  assert.equal((await submit({ rpcResult: { error: { message: "permission denied" } } })).status, 500);
  const guest = await submit({ user: null, payload: { testSessionId: null } });
  assert.equal(guest.status, 200);
  assert.equal(state.rpcCalls.length, 0);
  console.log("test-completion-route tests passed");
} finally {
  delete globalThis.__satTestCompletion;
}
