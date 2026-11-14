import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const zod = require("zod").z;

const userId = "00000000-0000-4000-8000-000000000001";
const assignmentId = "00000000-0000-4000-8000-000000000002";
const submissionId = "00000000-0000-4000-8000-000000000003";
const questionId = "00000000-0000-4000-8000-000000000004";

const url = (source) => "data:text/javascript;base64," + Buffer.from(source).toString("base64");
async function load(path, imports, fallbackUrl) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  source = source.replace('import "server-only";', "").replace(/from "([^"]+)"/g, (_, name) => `from "${imports[name] ?? fallbackUrl}"`);
  return url(require("typescript").transpileModule(source, { compilerOptions: { module: 99, target: 9 } }).outputText);
}
const request = (body = {}, withAuth = true) => ({
  headers: new Headers(withAuth ? { authorization: "Bearer fixture-token" } : {}),
  json: async () => body
});

// --- /api/homework/attempts: the student runner route. The route must never let
// a client-supplied correctness/score value flow into grading or persistence. ---
async function testAttemptsRoute() {
  const context = { authed: true, rpcResult: submissionId, calls: [], z: zod };
  globalThis.__satHomeworkTest = context;
  const mock = `
    const c = globalThis.__satHomeworkTest;
    export const z = c.z;
    export const NextResponse = { json: (body, init) => Response.json(body, init) };
    export async function getAuthenticatedUserId() { return c.authed ? '${userId}' : null; }
    export function getSupabaseAdminClient() { return { async rpc(name, args) { c.calls.push(['rpc', name, args]); return { data: c.rpcResult, error: c.rpcResult ? null : { message: 'nope' } }; } }; }
    export async function loadHomeworkAttempt(uid, sid) { c.calls.push(['load', uid, sid]); return { submissionId: sid, status: 'in_progress', questions: [], answers: {} }; }
    export async function saveHomeworkAnswer(args) { c.calls.push(['answer', args]); return undefined; }
    export async function submitHomeworkAttempt(args) { c.calls.push(['submit', args]); return { submissionId: args.submissionId, status: 'submitted', correctCount: 1, totalCount: 2, review: null }; }
  `;
  const mockUrl = url(mock);
  const route = await import(await load("../app/api/homework/attempts/route.ts", {}, mockUrl));

  context.authed = false;
  assert.equal((await route.POST(request({ action: "start", assignmentId }))).status, 401);
  context.authed = true;

  assert.equal((await route.POST(request({ action: "bogus" }))).status, 400);

  const started = await route.POST(request({ action: "start", assignmentId }));
  assert.equal(started.status, 200);
  assert.deepEqual(context.calls.at(-2), ["rpc", "start_assignment_attempt", { p_assignment: assignmentId, p_user: userId }]);
  assert.deepEqual(context.calls.at(-1), ["load", userId, submissionId]);

  context.rpcResult = null;
  assert.equal((await route.POST(request({ action: "start", assignmentId }))).status, 409);
  context.rpcResult = submissionId;

  context.calls = [];
  // A tampered client that also sends isCorrect/score must not influence what gets persisted:
  // the route's zod schema only forwards questionId/answer/timeSpentSeconds to saveHomeworkAnswer.
  await route.POST(request({ action: "answer", submissionId, questionId, answer: "A", isCorrect: true, score: 999 }));
  const answerCall = context.calls.find((call) => call[0] === "answer");
  assert.ok(answerCall, "answer action should call saveHomeworkAnswer");
  assert.deepEqual(Object.keys(answerCall[1]).sort(), ["answer", "questionId", "submissionId", "timeSpentSeconds", "userId"].sort());
  assert.equal(answerCall[1].answer, "A");
  assert.equal("isCorrect" in answerCall[1], false);

  context.calls = [];
  const submitted = await route.POST(request({ action: "submit", submissionId, correctCount: 999 }));
  assert.equal(submitted.status, 200);
  const submitCall = context.calls.find((call) => call[0] === "submit");
  assert.deepEqual(submitCall[1], { submissionId, userId });
  const submittedBody = await submitted.json();
  assert.equal(submittedBody.correctCount, 1, "score must come from the server mock, not the client-sent value");

  delete globalThis.__satHomeworkTest;
  console.log("homework attempts route: auth, invalid action, start/answer/submit wiring and no client-trusted grading fields passed");
}

// --- /api/teacher/homework: staff-only CRUD, mirroring the groups API conventions. ---
async function testTeacherRoutes() {
  const context = { role: "teacher", owned: true, rosterHasSubmission: false, calls: [], z: zod };
  globalThis.__satHomeworkTest = context;
  const mock = `
    const c = globalThis.__satHomeworkTest;
    export const z = c.z;
    export const NextResponse = { json: (body, init) => Response.json(body, init) };
    export async function getHomeworkStaff() { return c.role && c.role !== 'student' ? { actor: { id: '${userId}', role: c.role }, db: makeDb() } : null; }
    export function homeworkError() { return Response.json({ error: 'forbidden-or-bad' }, { status: 503 }); }
    function makeDb() {
      return {
        async rpc(name, args) {
          c.calls.push(['rpc', name, args]);
          if (name === 'list_teacher_assignments') return { data: [], error: null };
          if (name === 'set_assignment_questions') return { data: true, error: null };
          if (name === 'get_assignment_roster') return { data: c.owned ? (c.rosterHasSubmission ? [{ status: 'submitted' }] : [{ status: null }]) : [], error: c.owned ? null : { code: '42501' } };
          return { data: [], error: null };
        },
        from(table) {
          c.calls.push(['table', table]);
          return {
            insert(row) { c.calls.push(['insert', row]); return this; },
            update(patch) { c.calls.push(['update', patch]); return this; },
            delete() { c.calls.push(['delete']); return this; },
            eq(key, value) { c.calls.push(['eq', key, value]); return this; },
            select() { return this; },
            order() { return this; },
            async single() { return { data: { id: '${assignmentId}' }, error: null }; },
            async maybeSingle() { return { data: c.owned ? { id: '${assignmentId}' } : null, error: null }; },
            then(resolve) { resolve({ data: c.owned ? { id: '${assignmentId}', title: 'HW', kind: 'question_set' } : null, error: null }); }
          };
        }
      };
    }
  `;
  const mockUrl = url(mock);
  const list = await import(await load("../app/api/teacher/homework/route.ts", {}, mockUrl));
  const detail = await import(await load("../app/api/teacher/homework/[assignmentId]/route.ts", {}, mockUrl));
  const params = { params: Promise.resolve({ assignmentId }) };
  const validCreateBody = {
    groupId: "00000000-0000-4000-8000-000000000009",
    title: "HW",
    kind: "question_set",
    dueAt: new Date().toISOString()
  };

  for (const role of [null, "student"]) {
    context.role = role;
    for (const action of [
      () => list.GET(request()),
      () => list.POST(request(validCreateBody)),
      () => detail.GET(request(), params),
      () => detail.PATCH(request({ action: "publish", published: true }), params),
      () => detail.DELETE(request(), params)
    ]) {
      assert.equal((await action()).status, 403);
    }
  }

  context.role = "teacher";
  assert.equal((await list.POST(request({ ...validCreateBody, kind: "past_paper" }))).status, 400, "past_paper requires paperId");
  assert.equal((await list.POST(request(validCreateBody))).status, 201);

  assert.equal((await detail.PATCH(request({ action: "set_questions", questionIds: [questionId] }), params)).status, 200);
  assert.deepEqual(context.calls.at(-1), ["rpc", "set_assignment_questions", { p_assignment_id: assignmentId, p_question_ids: [questionId] }]);

  context.rosterHasSubmission = true;
  assert.equal((await detail.DELETE(request(), params)).status, 409, "deletion must be blocked once a student has submitted");
  context.rosterHasSubmission = false;
  assert.equal((await detail.DELETE(request(), params)).status, 200);

  context.owned = false;
  assert.equal((await detail.GET(request(), params)).status, 404);
  assert.equal((await detail.PATCH(request({ action: "publish", published: true }), params)).status, 404);

  delete globalThis.__satHomeworkTest;
  console.log("teacher homework routes: staff/role gating, past_paper validation, question wiring and delete-after-submission guard passed");
}

await testAttemptsRoute();
await testTeacherRoutes();
