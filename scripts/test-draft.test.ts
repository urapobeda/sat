import assert from "node:assert/strict";
import { createTestDraftStore } from "../lib/testDraft.ts";

const entries = new Map<string, string>();
const storage = {
  getItem: (key: string) => entries.get(key) ?? null,
  setItem: (key: string, value: string) => { entries.set(key, value); },
  removeItem: (key: string) => { entries.delete(key); }
};
const id = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
const questionId = "33333333-3333-4333-8333-333333333333";
const secondQuestionId = "44444444-4444-4444-8444-444444444444";
const draft = {
  questions: [questionId, secondQuestionId], sessionId: id,
  endsAt: Date.now() + 10000, answers: { [questionId]: "B" },
  flags: { [secondQuestionId]: true }, index: 1
};
const store = createTestDraftStore(() => storage);
assert.equal(store.read("student-a"), null);
store.save("student-a", id, draft);
// New store instance simulates a page reload: all progress and deadline survive.
assert.deepEqual(createTestDraftStore(() => storage).read("student-a"), { id, draft });
assert.equal(store.read("student-b"), null);
assert.equal(store.read(), null);
assert.ok([...entries.keys()].some((key) => key.endsWith(`:${id}`)));
store.save("student-a", secondId, { ...draft, sessionId: secondId });
store.clear("student-a", id);
assert.equal(store.read("student-a")?.id, secondId);
store.clear("student-a", secondId);
assert.equal(store.read("student-a"), null);
assert.equal(entries.size, 0);
store.save(undefined, id, { ...draft, sessionId: null });
assert.equal(store.read()?.id, id);
store.clear(undefined, id);
store.save("student-a", id, draft);
const key = [...entries.keys()].find((key) => key.includes("draft-v2"))!;
entries.set(key, "broken JSON");
assert.equal(store.read("student-a"), null);
entries.set(key, JSON.stringify({ ...draft, index: 30 }));
assert.equal(store.read("student-a"), null);
entries.set(key, JSON.stringify({ ...draft, sessionId: secondId }));
assert.equal(store.read("student-a"), null);
const blocked = createTestDraftStore(() => { throw new Error("Storage blocked"); });
assert.equal(blocked.read("student-a"), null);
assert.doesNotThrow(() => blocked.save("student-a", id, draft));
assert.doesNotThrow(() => blocked.clear("student-a", id));
const full = createTestDraftStore(() => ({ ...storage, setItem() { throw new Error("Quota exceeded"); } }));
assert.doesNotThrow(() => full.save("student-a", id, draft));
console.log("Test draft persistence tests passed (reload, isolation, cleanup, corruption and unavailable storage)");
