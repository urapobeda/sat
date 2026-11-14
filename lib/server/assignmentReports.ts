import "server-only";
import type { getHomeworkStaff } from "@/lib/server/homeworkAccess";
import { getReviewQuestions } from "@/lib/server/questionSolutions";
import { analyzeAssignment, type ReportRow } from "@/lib/assignmentReport";
import type { AssignmentAnswer } from "@/lib/homework";
type Staff = NonNullable<Awaited<ReturnType<typeof getHomeworkStaff>>>;
async function loadRoster(staff: Staff, id: string) {
  const rows: ReportRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await staff.db.rpc("get_assignment_report_rows", { p_assignment: id }).range(offset, offset + 999);
    if (result.error) throw result.error;
    rows.push(...result.data ?? []);
    if ((result.data?.length ?? 0) < 1000) break;
  }
  return rows;
}
export async function loadAssignmentReport(staff: Staff, id: string) {
  const assignment = await staff.db.from("assignments").select("*").eq("id", id).maybeSingle();
  if (assignment.error) throw assignment.error;
  if (!assignment.data) throw { code: "P0002" };
  const rows = await loadRoster(staff, id);
  const links = await staff.db.from("assignment_questions").select("question_id,position").eq("assignment_id", id).order("position");
  if (links.error) throw links.error;
  const completedIds = rows.filter((row) => row.status === "submitted" && row.submission_id).map((row) => row.submission_id!);
  const answers: AssignmentAnswer[] = [];
  for (let i = 0; i < completedIds.length; i += 100) for (let offset = 0; ; offset += 1000) {
    const result = await staff.db.from("assignment_answers").select("*").in("submission_id", completedIds.slice(i, i + 100)).order("submission_id").order("question_id").range(offset, offset + 999);
    if (result.error) throw result.error;
    answers.push(...result.data ?? []);
    if ((result.data?.length ?? 0) < 1000) break;
  }
  const questionIds = links.data?.map((link) => link.question_id) ?? [];
  const topics = questionIds.length ? await staff.db.from("questions").select("id,topic").in("id", questionIds) : { data: [], error: null };
  if (topics.error) throw topics.error;
  const questions = (links.data ?? []).map((link) => ({ ...link, topic: topics.data?.find((question) => question.id === link.question_id)?.topic ?? "" }));
  return { assignment: assignment.data, rows, ...analyzeAssignment(rows, answers, questions, assignment.data.due_at) };
}
export async function loadStudentWork(staff: Staff, id: string, studentId: string, requestedSubmission?: string) {
  // The RPC checks the group in SQL and returns only this assignment's roster.
  const roster = await loadRoster(staff, id);
  const student = roster.find((row) => row.student_id === studentId);
  if (!student) throw { code: "P0002" };
  const result = await staff.db.from("assignment_submissions").select("*").eq("assignment_id", id).eq("student_id", studentId).order("attempt_no", { ascending: false });
  if (result.error) throw result.error;
  const attempts = result.data ?? [];
  const submission = requestedSubmission ? attempts.find((item) => item.id === requestedSubmission) : attempts[0];
  if (requestedSubmission && !submission) throw { code: "P0002" };
  if (!submission) return { student, submission: null, attempts, questions: [], answers: [], feedback: [], retakeGranted: false };
  const [answers, links, feedback, grant] = await Promise.all([
    staff.db.from("assignment_answers").select("*").eq("submission_id", submission.id),
    staff.db.from("assignment_questions").select("question_id,position").eq("assignment_id", id).order("position"),
    staff.db.from("assignment_feedback").select("*").eq("submission_id", submission.id).order("created_at"),
    staff.db.from("assignment_retake_grants").select("submission_id").eq("submission_id", submission.id).maybeSingle()
  ]);
  for (const item of [answers, links, feedback, grant]) if (item.error) throw item.error;
  const ids = links.data?.map((link) => link.question_id) ?? [];
  // Correct answers are loaded only after verified staff + assignment RLS checks.
  const review = await getReviewQuestions(Object.fromEntries(ids.map((questionId) => [questionId, answers.data?.find((answer) => answer.question_id === questionId)?.answer ?? null])));
  const questions = ids.map((questionId) => review.find((question) => question.id === questionId)).filter((q): q is NonNullable<typeof q> => Boolean(q));
  return { student, submission, attempts, questions, answers: answers.data ?? [], feedback: feedback.data ?? [], retakeGranted: Boolean(grant.data) };
}
