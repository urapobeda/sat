import assert from "node:assert/strict";
import { loadQuestionPages } from "../lib/supabase/questionPagination.ts";

const bank = Array.from({ length: 3763 }, (_, id) => ({ id, section: id < 1838 ? "reading-writing" : "math" }));
const firstResponse = bank.slice(0, 2000);
assert.equal(firstResponse.filter((q) => q.section === "math").length, 162);

const requests: Array<[number, number, boolean]> = [];
const full = await loadQuestionPages(async (from, to, withCount) => {
  requests.push([from, to, withCount]);
  return { data: bank.slice(from, to + 1), error: null, count: withCount ? bank.length : null };
});
assert.equal(full.data?.length, 3763);
assert.equal(full.data?.filter((q) => q.section === "math").length, 1925);
assert.equal(new Set(full.data?.map((q) => q.id)).size, 3763);
assert.equal(requests.filter((r) => r[2]).length, 1, "only the first page needs an exact count");

// A server can return fewer rows than the requested range. Never skip a gap.
const capped = await loadQuestionPages(async (from, to, withCount) => ({
  data: bank.slice(from, Math.min(to + 1, from + 100)), error: null, count: withCount ? bank.length : null
}));
assert.deepEqual(capped.data, bank);

let active = 0;
let peak = 0;
const parallel = await loadQuestionPages(async (from, to, withCount) => {
  active += 1;
  peak = Math.max(peak, active);
  await new Promise((resolve) => setTimeout(resolve, from % 3));
  active -= 1;
  return { data: bank.slice(from, to + 1), error: null, count: withCount ? bank.length : null };
});
assert.equal(peak, 4, "later pages load with bounded parallelism");
assert.deepEqual(parallel.data, bank, "parallel responses preserve question order");

const changingCap = await loadQuestionPages(async (from, to, withCount) => ({
  data: bank.slice(from, Math.min(to + 1, from + (from === 0 ? 500 : 100))),
  error: null, count: withCount ? bank.length : null
}));
assert.deepEqual(changingCap.data, bank, "a reduced server cap never skips questions");

const limited = await loadQuestionPages(async (from, to, withCount) => ({
  data: bank.slice(from, Math.min(to + 1, from + 100)), error: null, count: withCount ? bank.length : null
}), 625);
assert.deepEqual(limited.data, bank.slice(0, 625));

const noCount = await loadQuestionPages(async (from, to) => ({
  data: bank.slice(from, Math.min(to + 1, from + 100)), error: null
}));
assert.deepEqual(noCount.data, bank);
assert.deepEqual((await loadQuestionPages(async () => ({ data: [], error: null, count: 0 }))).data, []);

const failed = await loadQuestionPages(async (from) => from === 0
  ? { data: bank.slice(0, 500), error: null, count: bank.length }
  : { data: null, error: { message: "Second page failed" } });
assert.equal(failed.data, null, "never present a partially loaded bank as complete");
assert.equal(failed.error?.message, "Second page failed");

const changed = await loadQuestionPages(async (from) => ({ data: from === 0 ? bank.slice(0, 500) : [], error: null, count: bank.length }));
assert.equal(changed.data, null);
assert.match(changed.error?.message ?? "", /changed while loading/);

console.log("question-pagination tests passed");
