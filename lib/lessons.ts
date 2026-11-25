export type LessonPart = "classwork" | "homework";
export type LessonSection = "math" | "reading_writing" | "general";
export type Lesson = {
  id: string; group_id: string; title: string; section: LessonSection; topic: string;
  starts_at: string | null; position: number; notes: string; created_by: string; created_at: string;
};
export type LessonItem = {
  id: string; lesson_id: string; part: LessonPart; position: number;
  question_id: string | null; title: string | null; body: string | null;
};
export type LessonRow = Lesson & { group_name: string; teacher_name: string; member_count: number };
export type LessonHomework = {
  id: string; lesson_id: string; lesson_part: LessonPart; title: string; due_at: string | null;
  status: "in_progress" | "submitted" | null; submitted_at: string | null;
  correct_count: number | null; total_count: number | null;
};
export type CourseData = { lessons: LessonRow[]; assignments: LessonHomework[]; homeworkError?: boolean };
export const LESSON_SECTIONS: Record<LessonSection, string> = { math: "Math", reading_writing: "Reading & Writing", general: "General" };
export const LESSON_PARTS: Record<LessonPart, string> = { classwork: "Classwork", homework: "Homework" };

export function lessonHomeworkStatus(item: LessonHomework, now = Date.now()) {
  if (item.status === "submitted") return "Submitted";
  if (item.due_at && Date.parse(item.due_at) < now) return "Overdue";
  return item.status === "in_progress" ? "In progress" : "Not started";
}
export function formatLessonDate(iso: string | null) {
  return iso ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Almaty", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "No date set";
}
/** Calendar days in Almaty, independent of the teacher's browser timezone. */
export function quickLessonDueDate(days: number, now = Date.now()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now)).map(p => [p.type, p.value]));
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + days)).toISOString().slice(0, 10);
}
