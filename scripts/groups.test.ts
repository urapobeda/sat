import assert from "node:assert/strict";
import { GROUP_CODE_PATTERN, getAuthReturnPath, normalizeGroupCode } from "../lib/groups.ts";
assert.equal(normalizeGroupCode(" abcd2345 "), "ABCD2345");
assert.equal(GROUP_CODE_PATTERN.test("ABCD2345"), true);
for (const code of ["ABCD1234", "ABCDO234", "ABCDI234", "ABCDL234", "ABC2345", "ABCDEFGHI"]) assert.equal(GROUP_CODE_PATTERN.test(code), false);
assert.equal(getAuthReturnPath("?next=%2Fjoin%2FABCD2345"), "/join/ABCD2345");
assert.equal(getAuthReturnPath("?next=%2Flive%2FABCD2345"), "/live/ABCD2345");
assert.equal(getAuthReturnPath("?mode=callback&next=%2Flive%2FABCD2345"), "/live/ABCD2345");
for (const path of ["https://evil.example", "//evil.example", "/admin/users", "/join/ABCD2345/..", "/join/ABCD2345?evil=1", "/live/ABCD2345/..", "/live/ABCD2345?evil=1", "/live/ABCD2345#fragment", "/live/ABCD1234"]) {
  assert.equal(getAuthReturnPath(`?next=${encodeURIComponent(path)}`), "/question-bank");
}
assert.equal(getAuthReturnPath(""), "/question-bank");
for (const path of ["/course", "/course/texts", "/course/useful", "/course/hard-questions", "/course/practice-tests", "/vocabulary", "/homework", "/materials", "/course/texts/00000000-0000-4000-8000-000000000001"]) assert.equal(getAuthReturnPath(`?next=${encodeURIComponent(path)}`), path);
for (const path of ["/course/texts/../../admin", "/course/texts/invalid", "/course//evil", "/course?redirect=https://evil.test", "/course/texts#fragment"]) assert.equal(getAuthReturnPath(`?next=${encodeURIComponent(path)}`), "/question-bank");
console.log("Group invitation tests passed (normalization, safe return URL and ambiguous-character rejection)");
