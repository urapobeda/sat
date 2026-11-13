import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

// Only run with dedicated QA accounts. Credentials are read from a private file,
// and every request to the application uses the student's token.
const [accountFile, manifestFile, origin = "http://localhost:3000", selectedSection = "reading-writing"] = process.argv.slice(2);
if (!accountFile || !manifestFile) throw new Error("Provide QA account and prepared manifest paths");
const accounts = JSON.parse(await readFile(accountFile, "utf8"));
const papers = JSON.parse(await readFile(manifestFile, "utf8"));
const source = papers[0];
const keys = new Map(source.modules.flatMap((part) => part.items.map((item) => [item.id, item.accepted_answers])));
async function call(payload, account = accounts[0]) {
  const response = await fetch(origin + "/api/papers/attempts", {
    method: "POST", headers: { Authorization: "Bearer " + account.token, "Content-Type": "application/json" }, body: JSON.stringify(payload)
  });
  return { status: response.status, body: await response.json() };
}
let result = await call({ action: "open", slug: source.slug, section: selectedSection });
assert.equal(result.status, 200, JSON.stringify(result.body));
let state = result.body;
const attempt = state.attemptId;
assert.equal(state.review.length, 0);
assert(!JSON.stringify(state).includes("accepted_answers"));
assert(state.modules.every((part) => part.run.graded === null));
assert.equal((await call({ action: "open", slug: source.slug, section: selectedSection })).body.attemptId, attempt);
assert.equal((await call({ action: "get", attemptId: attempt }, accounts[1])).status, 500);
assert.equal((await call({ action: "save", attemptId: attempt, moduleId: state.modules[1].id, revision: 0, answers: {}, flags: {}, index: 0 })).status, 409);
let deliberateWrong = false;
let submission;
while (state.current) {
  const part = state.modules.find((part) => part.id === state.current);
  const answers = Object.fromEntries(state.items.map((item) => {
    const correct = keys.get(item.id)[0];
    const value = deliberateWrong ? correct : correct === "A" ? "B" : "A";
    deliberateWrong = true;
    return [item.id, value];
  }));
  const flagged = state.items[0].id;
  const save = { action: "save", attemptId: attempt, moduleId: state.current, revision: part.run.revision, answers, flags: { [flagged]: true }, index: 1 };
  result = await call(save);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal((await call(save)).status, 409, "A stale draft cannot overwrite saved answers");
  const reloaded = (await call({ action: "get", attemptId: attempt })).body;
  const run = reloaded.modules.find((entry) => entry.id === state.current).run;
  assert.deepEqual(run.answers, answers);
  assert.equal(run.flags[flagged], true);
  assert.equal(run.current_index, 1);
  assert.equal(run.deadline, part.run.deadline);
  submission = { ...save, action: "submit", revision: run.revision };
  result = await call(submission);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  state = result.body;
  if (!state.completed) {
    assert.equal(state.review.length, 0);
    assert(state.modules.every((entry) => entry.run.graded === null));
  }
}
assert.equal(state.completed, true);
const total = state.modules.reduce((sum, part) => sum + part.question_count, 0);
assert.equal(state.modules.reduce((sum, part) => sum + part.run.score, 0), total - 1);
assert.equal(state.review.length, total);
assert.equal(state.review.filter((item) => item.correct).length, total - 1);
assert.deepEqual((await call(submission)).body.review, state.review);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "").replace(/\/rest\/v1$/, "");
const student = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { global: { headers: { Authorization: "Bearer " + accounts[1].token } }, auth: { persistSession: false } });
const privateData = await student.from("paper_module_runs").select("attempt_id").eq("attempt_id", attempt);
assert.equal(privateData.error, null);
assert.equal(privateData.data.length, 0);
assert((await student.from("paper_solutions").select("*")).error);
assert((await student.from("paper_module_runs").select("graded")).error);
assert((await student.from("exam_attempts").update({ raw_score: 999 }).eq("id", attempt)).error);
console.log(`Live paper test passed: ${total} questions, correct/incorrect grading, saved drafts and flags, resume, locked modules, duplicate submissions, result review and cross-user isolation`);
