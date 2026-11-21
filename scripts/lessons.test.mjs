import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
async function load(filename) {
  const source = await readFile(new URL(filename, import.meta.url), "utf8");
  return import("data:text/javascript;base64," + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: 99, target: 9 } }).outputText).toString("base64"));
}
const lessons = await load("../lib/lessons.ts"), homework = await load("../lib/homework.ts"), time = await load("../lib/timezone.ts"), report = await load("../lib/assignmentReport.ts");
const originalTZ = process.env.TZ;
try {
  for (const zone of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
    process.env.TZ = zone;
    assert.equal(lessons.quickLessonDueDate(1, Date.parse("2026-12-31T20:00:00Z")), "2027-01-02");
    assert.equal(lessons.quickLessonDueDate(1, Date.parse("2026-12-31T18:59:59Z")), "2027-01-01");
    assert.equal(lessons.quickLessonDueDate(3, Date.parse("2028-02-27T12:00:00Z")), "2028-03-01");
    assert.equal(lessons.quickLessonDueDate(7, Date.parse("2026-11-21T12:00:00Z")), "2026-11-28");
  }
} finally { if (originalTZ === undefined) delete process.env.TZ; else process.env.TZ = originalTZ; }
assert.equal(lessons.lessonHomeworkStatus({ status: null, due_at: null }), "Not started");
assert.equal(lessons.lessonHomeworkStatus({ status: "in_progress", due_at: null }), "In progress");
assert.equal(lessons.lessonHomeworkStatus({ status: null, due_at: "2026-01-01T00:00:00Z" }, Date.parse("2026-02-01")), "Overdue");
assert.equal(lessons.lessonHomeworkStatus({ status: "submitted", due_at: "2026-01-01T00:00:00Z" }), "Submitted");
assert.equal(homework.isPastDue(null), false);
assert.equal(homework.canRevealAnswers("after_due", null, true), false);
assert.equal(report.reportStatus({ status: "submitted", submitted_at: "2026-02-01T00:00:00Z" }, null), "submitted");
assert.equal(time.formatAlmaty(null), "No due date");
assert.deepEqual(time.utcIsoToAlmatyInput(null), { date: "", time: "23:59" });
assert.match(lessons.formatLessonDate("2026-12-31T20:00:00Z"), /1 Jan 2027.*01:00/);
console.log("Lesson logic tests passed (Almaty calendar deadlines, year/leap-day boundaries, four homework states and no-deadline reports/reviews)");
