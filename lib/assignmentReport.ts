import type { AssignmentAnswer, AssignmentSubmission } from "@/lib/homework";
import type { ReviewQuestion } from "@/types/sat";
export type AssignmentFeedback = { id: string; submission_id: string; question_id: string | null; author_id: string; body: string; created_at: string };
export type ReportRow = { student_id: string; full_name: string; is_member: boolean; submission_id: string | null; attempt_no: number | null; status: "in_progress" | "submitted" | null; started_at: string | null; submitted_at: string | null; correct_count: number | null; total_count: number | null; extra_attempts: number };
export type ReportStatus = "not_started" | "in_progress" | "submitted" | "late";
export const REPORT_STATUS: Record<ReportStatus, string> = { not_started: "Не начал", in_progress: "В процессе", submitted: "Сдано", late: "Сдано с опозданием" };
export function reportStatus(row: ReportRow, due: string): ReportStatus {
  if (!row.status) return "not_started";
  if (row.status === "in_progress") return "in_progress";
  return row.submitted_at && Date.parse(row.submitted_at) > Date.parse(due) ? "late" : "submitted";
}
export function reportPercent(row: Pick<ReportRow, "correct_count" | "total_count">) {
  return row.total_count ? Math.round((row.correct_count ?? 0) / row.total_count * 100) : null;
}
export function elapsedSeconds(row: Pick<ReportRow, "started_at" | "submitted_at">) {
  return row.started_at && row.submitted_at ? Math.max(0, Math.round((Date.parse(row.submitted_at) - Date.parse(row.started_at)) / 1000)) : null;
}
export function duration(seconds: number | null) {
  if (seconds === null) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function analyzeAssignment(rows: ReportRow[], answers: AssignmentAnswer[], questions: { question_id: string; position: number; topic?: string }[], due: string) {
  const submitted = rows.filter((row) => row.status === "submitted" && row.submission_id);
  const ids = new Set(submitted.map((row) => row.submission_id));
  const byQuestion = new Map<string, AssignmentAnswer[]>();
  for (const answer of answers) {
    if (!ids.has(answer.submission_id)) continue;
    const list = byQuestion.get(answer.question_id) ?? [];
    list.push(answer); byQuestion.set(answer.question_id, list);
  }
  const percentages = submitted.map(reportPercent).filter((value): value is number => value !== null);
  return {
    summary: { total: rows.length, submitted: submitted.length, late: submitted.filter((row) => reportStatus(row, due) === "late").length,
      notStarted: rows.filter((row) => !row.status).length, average: percentages.length ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) : null },
    questions: questions.map((question) => {
      const values = byQuestion.get(question.question_id) ?? [];
      const correct = values.filter((answer) => answer.is_correct === true).length;
      const wrong = new Map<string, number>();
      for (const value of values) if (value.is_correct !== true && value.answer?.trim()) {
        const answer = value.answer.trim(); wrong.set(answer, (wrong.get(answer) ?? 0) + 1);
      }
      const frequent = [...wrong].sort(([a, ac], [b, bc]) => bc - ac || a.localeCompare(b))[0];
      return { ...question, correct, total: submitted.length, percent: submitted.length ? Math.round(correct / submitted.length * 100) : null,
        frequentWrong: frequent?.[0] ?? null, frequentWrongCount: frequent?.[1] ?? 0,
        unanswered: submitted.length - values.filter((value) => Boolean(value.answer?.trim())).length,
        needsReview: submitted.length > 0 && submitted.length - correct > submitted.length / 2 };
    })
  };
}
export function reportCsv(rows: ReportRow[], due: string) {
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return "\uFEFF" + [["Ученик", "Статус", "Правильно", "Всего", "%", "Время (м:с)", "Дата сдачи", "Попытка"],
    ...rows.map((row) => [row.full_name, REPORT_STATUS[reportStatus(row, due)], row.status === "submitted" ? row.correct_count : "", row.status === "submitted" ? row.total_count : "", row.status === "submitted" ? reportPercent(row) : "", duration(elapsedSeconds(row)), row.submitted_at ?? "", row.attempt_no ?? ""])]
    .map((row) => row.map(cell).join(",")).join("\r\n");
}
export type StudentWork = { student: ReportRow; submission: AssignmentSubmission | null; attempts: AssignmentSubmission[]; questions: ReviewQuestion[]; answers: AssignmentAnswer[]; feedback: AssignmentFeedback[]; retakeGranted: boolean };
