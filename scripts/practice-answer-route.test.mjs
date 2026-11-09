import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

// Run the real route with grading/auth/database I/O replaced, never touching a
// student's account or requiring a configured Supabase database for unit tests.
const require = createRequire(import.meta.url);
const ts = require("typescript");
const context = { z: require("zod").z, current: null };
globalThis.__satTimingRouteTest = context;
const mockSource = `
export const z = globalThis.__satTimingRouteTest.z;
export const NextResponse = { json: (data, init) => Response.json(data, init) };
export async function getAuthenticatedUserId() { return globalThis.__satTimingRouteTest.current.user; }
export async function gradeQuestionAnswer() {
  const current = globalThis.__satTimingRouteTest.current;
  if (current.waitForOwnership) await current.waitForOwnership;
  return current.feedback;
}
export function getSupabaseAdminClient() { return globalThis.__satTimingRouteTest.current.db; }
`;
const mockUrl = "data:text/javascript;base64," + Buffer.from(mockSource).toString("base64");
let source = await readFile(new URL("../app/api/practice/answers/route.ts", import.meta.url), "utf8");
source = source.replace(/from "(next\/server|zod|@\/lib\/server\/auth|@\/lib\/server\/questionSolutions|@\/lib\/supabase\/admin)"/g, `from "${mockUrl}"`);
source = source.replace("@/lib/practiceTiming", new URL("../lib/practiceTiming.ts", import.meta.url).href);
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { POST } = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));
const user = "00000000-0000-4000-8000-000000000001";
const question = "00000000-0000-4000-8000-000000000002";
const session = "00000000-0000-4000-8000-000000000003";

async function check({ correct, guest = false, missingColumn = false, owned = true, invalid = false, verifyOverlap = false }) {
  const writes = [];
  const filters = [];
  let ownershipStarted;
  const waitForOwnership = verifyOverlap ? new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Ownership lookup did not run in parallel")), 500);
    ownershipStarted = () => { clearTimeout(timeout); resolve(); };
  }) : undefined;
  context.current = {
    user: guest ? null : user,
    waitForOwnership,
    feedback: { isCorrect: correct, correctAnswer: "B", correctLabel: "B", explanation: "Verified on the server." },
    db: {
      from(table) {
        if (table === "practice_sessions") return {
          select() { return this; },
          eq(key, value) { filters.push([key, value]); return this; },
          async maybeSingle() { ownershipStarted?.(); return { data: owned ? { id: session, user_id: user } : null, error: null }; }
        };
        assert.equal(table, "practice_answers");
        return { async upsert(row) {
          writes.push(row);
          return { error: missingColumn && Object.hasOwn(row, "time_spent_seconds") ? { message: "Could not find the 'time_spent_seconds' column in the schema cache" } : null };
        } };
      }
    }
  };
  const response = await POST({ json: async () => ({ questionId: question, sessionId: session, selectedAnswer: "B", timeSpentSeconds: invalid ? -10 : 37, isCorrect: true }) });
  return { response, body: await response.json(), writes, filters };
}

try {
  const correct = await check({ correct: true, verifyOverlap: true });
  assert.equal(correct.body.timingRecorded, true);
  assert.equal(correct.body.answerSaved, true);
  assert.equal(correct.writes[0].time_spent_seconds, 37);
  assert.deepEqual(correct.filters, [["id", session], ["user_id", user]]);

  const wrong = await check({ correct: false });
  assert.equal(wrong.body.isCorrect, false, "client correctness flags are ignored");
  assert.equal(wrong.body.timingRecorded, false);
  assert.equal(wrong.writes[0].time_spent_seconds, null);
  assert.equal(wrong.writes[0].correct_answer, null);
  assert.deepEqual(wrong.body, { isCorrect: false, answerSaved: true, timingRecorded: false });
  assert.equal(wrong.writes[0].is_correct, false, "wrong answers still contribute to accuracy history");

  const guest = await check({ correct: true, guest: true });
  assert.equal(guest.body.isCorrect, true);
  assert.equal(guest.body.timingRecorded, false);
  assert.equal(guest.writes.length, 0);

  const legacy = await check({ correct: true, missingColumn: true });
  assert.equal(legacy.body.answerSaved, true);
  assert.equal(legacy.body.timingRecorded, false);
  assert.equal(legacy.writes.length, 2);
  assert.equal(Object.hasOwn(legacy.writes[1], "time_spent_seconds"), false);

  const otherSession = await check({ correct: true, owned: false });
  assert.equal(otherSession.body.answerSaved, false);
  assert.equal(otherSession.writes.length, 0);
  const invalid = await check({ correct: true, invalid: true });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.writes.length, 0);
  console.log("practice-answer-route tests passed");
} finally {
  delete globalThis.__satTimingRouteTest;
}
