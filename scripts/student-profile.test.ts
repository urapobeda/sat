import assert from "node:assert/strict";
import { summarizeStudent, daysUntilSAT } from "../lib/studentProfile.ts";
import type {
  PracticeAnswer,
  PracticeSession,
  TestSession,
  Assignment,
} from "../types/database.ts";
import type { AssignmentSubmission } from "../lib/homework.ts";
const a = (id: string, correct: boolean, at: string): PracticeAnswer => ({
  id,
  user_id: "s",
  session_id: "p",
  question_id: "q",
  selected_answer: "A",
  correct_answer: null,
  is_correct: correct,
  time_spent_seconds: 10,
  created_at: at,
});
const assignment = {
  id: "hw",
  published: true,
  due_at: "2026-11-20T12:00:00Z",
} as Assignment;
const submission = (
  attempt: number,
  submitted: string | null,
): AssignmentSubmission => ({
  id: String(attempt),
  assignment_id: "hw",
  student_id: "s",
  attempt_no: attempt,
  status: submitted ? "submitted" : "in_progress",
  submitted_at: submitted,
  started_at: "2026-11-20T10:00:00Z",
  correct_count: 1,
  total_count: 2,
});
const base = {
  practice: [
    { id: "p", completed_at: "2026-11-20T11:00:00Z", score: 1, total: 2 },
  ] as PracticeSession[],
  practiceAnswers: [
    a("a", false, "2026-11-20T10:00:00Z"),
    a("b", true, "2026-11-20T11:00:00Z"),
  ],
  tests: [] as TestSession[],
  testAnswers: [],
  exams: [],
  submissions: [submission(1, "2026-11-20T11:00:00Z")],
  assignments: [assignment],
  questions: [{ id: "q", section: "math" as const, topic: "Circles" }],
};
let result = summarizeStudent(base);
assert.equal(
  result.answered,
  1,
  "repeat attempts do not inflate distinct answered questions",
);
assert.equal(result.accuracy, 100);
assert.equal(result.skills[0].name, "Circles");
assert.deepEqual(result.homework, {
  onTime: 1,
  late: 0,
  missing: 0,
  average: 50,
});
result = summarizeStudent({
  ...base,
  submissions: [...base.submissions, submission(2, "2026-11-20T13:00:00Z")],
});
assert.equal(result.homework.onTime, 0);
assert.equal(result.homework.late, 1, "latest attempt only");
result = summarizeStudent({
  ...base,
  submissions: [...base.submissions, submission(2, null)],
});
assert.equal(result.homework.missing, 1);
assert.equal(result.homework.average, null);
assert.equal(
  summarizeStudent({
    ...base,
    practice: [],
    practiceAnswers: [],
    submissions: [],
  }).accuracy,
  null,
  "no fake zero accuracy",
);
assert.equal(
  result.tests.length,
  0,
  "missing section scores must not be invented",
);
assert.equal(
  daysUntilSAT(
    "2026-11-21",
    Date.parse("2026-11-20T20:00:00Z"),
    "Asia/Qyzylorda",
  ),
  0,
);
assert.equal(
  daysUntilSAT(
    "2026-11-21",
    Date.parse("2026-11-20T20:00:00Z"),
    "America/Los_Angeles",
  ),
  1,
);
assert.equal(
  daysUntilSAT(
    "2026-11-21",
    Date.parse("2026-11-20T20:00:00Z"),
    "Pacific/Kiritimati",
  ),
  0,
);
assert.equal(summarizeStudent({...base,practiceAnswers:[...base.practiceAnswers,{...a('ungraded',false,'2026-11-21T10:00:00Z'),is_correct:null}]}).answered,1,'ungraded rows do not erase completed question progress');
assert.equal(summarizeStudent({...base,submissions:[submission(1,'2026-11-20T16:00:00+05:00')]}).homework.onTime,1,'late status compares instants, not ISO string order');
console.log(
  "Student profile analytics passed (deduplication, skill accuracy, latest homework attempt, late status and empty data)",
);
