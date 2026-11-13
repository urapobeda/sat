import assert from "node:assert/strict";
import { getPaperAttemptAccuracy, getPaperAttemptTotal } from "../lib/pastPapers.ts";
import type { ExamAttempt, ExamModule } from "../types/database.ts";
import { paperAcceptedAnswers } from "../lib/paperRunner.ts";

const modules = [
  { section: "reading-writing", question_count: 27 },
  { section: "reading-writing", question_count: 27 },
  { section: "math", question_count: 22 },
  { section: "math", question_count: 22 }
] as ExamModule[];
const attempt = { selected_section: "math", raw_score: 43 } as ExamAttempt;
assert.equal(getPaperAttemptTotal(attempt, modules), 44);
assert.equal(getPaperAttemptAccuracy(attempt, modules), 98);
assert.equal(getPaperAttemptTotal({ ...attempt, selected_section: "reading-writing" }, modules), 54);
assert.equal(getPaperAttemptTotal({ ...attempt, selected_section: "full" }, modules), 98);
assert.equal(getPaperAttemptAccuracy(attempt, []), 0);
const thirds = paperAcceptedAnswers(["2/3"]);
for (const value of ["0.666", "0.667", "0.6666", "0.6667"]) assert(thirds.includes(value));
for (const value of ["0.66", "0.67"]) assert(!thirds.includes(value));
assert(paperAcceptedAnswers(["10/3"]).includes("3.333"));
assert(paperAcceptedAnswers(["-1/3"]).includes("-0.3333"));
assert.deepEqual(paperAcceptedAnswers(["14"]), ["14"]);
assert.deepEqual(paperAcceptedAnswers(["B"]), ["B"]);
console.log("Paper statistics tests passed (section-specific totals and accuracy)");
