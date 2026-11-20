import type {
  Profile,
  PracticeSession,
  PracticeAnswer,
  TestSession,
  TestAnswer,
  ExamAttempt,
  Assignment,
} from "@/types/database";
import type { AssignmentSubmission } from "@/lib/homework";
import { getQuestionSubtopic } from "./questionBankStructure.ts";

export type ProfileData = {
  profile: Profile;
  avatar: string | null;
  groups: { id: string; name: string; teacher_name: string }[];
  tests: {
    id: string;
    date: string;
    score: number | null;
    rw: number | null;
    math: number | null;
    label: string;
  }[];
  skills: {
    name: string;
    section: "math" | "reading-writing";
    correct: number;
    total: number;
    accuracy: number;
  }[];
  answered: number;
  accuracy: number | null;
  lastActivity: string | null;
  timing: { date: string; seconds: number }[];
  activity: { id: string; date: string; label: string; result: string }[];
  homework: {
    onTime: number;
    late: number;
    missing: number;
    average: number | null;
  };
  notes: { id: string; body: string; created_at: string }[];
};
export function daysUntilSAT(satDate: string, now: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return Math.round(
    (Date.parse(satDate) -
      Date.UTC(part("year"), part("month") - 1, part("day"))) /
      86400000,
  );
}
export function summarizeStudent(data: {
  practice: PracticeSession[];
  practiceAnswers: Pick<
    PracticeAnswer,
    "question_id" | "is_correct" | "created_at" | "time_spent_seconds"
  >[];
  tests: TestSession[];
  testAnswers: Pick<TestAnswer, "question_id" | "is_correct" | "created_at">[];
  exams: ExamAttempt[];
  submissions: AssignmentSubmission[];
  assignments: Assignment[];
  questions: {
    id: string;
    section: "math" | "reading-writing";
    topic: string;
  }[];
}) {
  const completedPractice = data.practice.filter((s) => s.completed_at);
  const tests = [
    ...data.tests
      .filter((s) => s.completed_at)
      .map((s) => ({
        id: s.id,
        date: s.completed_at!,
        score: s.estimated_sat_score,
        rw: null,
        math: null,
        label: "Practice test",
      })),
    ...data.exams
      .filter((s) => s.status === "completed")
      .map((s) => ({
        id: s.id,
        date: s.completed_at ?? s.started_at,
        score: s.estimated_score,
        rw: s.reading_writing_score,
        math: s.math_score,
        label: "Past paper",
      })),
  ].sort((a, b) => Date.parse(b.date)-Date.parse(a.date));
  const latest = new Map<
    string,
    { question_id: string; is_correct: boolean | null; created_at: string }
  >();
  for (const a of [...data.practiceAnswers, ...data.testAnswers]) {
    if (a.is_correct === null) continue;
    const prev = latest.get(a.question_id);
    if (!prev || Date.parse(a.created_at) > Date.parse(prev.created_at)) latest.set(a.question_id, a);
  }
  const graded = [...latest.values()].filter((a) => a.is_correct !== null);
  const metadata = new Map(data.questions.map((q) => [q.id, q]));
  const skillMap = new Map<
    string,
    {
      name: string;
      section: "math" | "reading-writing";
      correct: number;
      total: number;
      accuracy: number;
    }
  >();
  for (const answer of graded) {
    const q = metadata.get(answer.question_id);
    if (!q) continue;
    const name = getQuestionSubtopic(q);
    const key = q.section + name;
    const skill = skillMap.get(key) ?? {
      name,
      section: q.section,
      correct: 0,
      total: 0,
      accuracy: 0,
    };
    skill.total++;
    if (answer.is_correct) skill.correct++;
    skill.accuracy = Math.round((100 * skill.correct) / skill.total);
    skillMap.set(key, skill);
  }
  const latestHomework = new Map<string, AssignmentSubmission>();
  for (const s of data.submissions) {
    const prev = latestHomework.get(s.assignment_id);
    if (!prev || s.attempt_no > prev.attempt_no)
      latestHomework.set(s.assignment_id, s);
  }
  let onTime = 0,
    late = 0,
    missing = 0;
  const percentages: number[] = [];
  for (const a of data.assignments.filter((a) => a.published)) {
    const s = latestHomework.get(a.id);
    if (s?.status !== "submitted") {
      missing++;
      continue;
    }
    if (s.submitted_at && Date.parse(s.submitted_at) > Date.parse(a.due_at)) late++;
    else onTime++;
    if (s.total_count)
      percentages.push((100 * (s.correct_count ?? 0)) / s.total_count);
  }
  const activity = [
    ...completedPractice.map((s) => ({
      id: s.id,
      date: s.completed_at!,
      label: "Practice",
      result: `${s.score}/${s.total}`,
    })),
    ...tests.map((t) => ({
      id: t.id,
      date: t.date,
      label: t.label,
      result: t.score === null ? "—" : String(t.score),
    })),
    ...data.submissions
      .filter((s) => s.status === "submitted")
      .map((s) => ({
        id: s.id,
        date: s.submitted_at!,
        label: "Homework",
        result: `${s.correct_count ?? 0}/${s.total_count ?? 0}`,
      })),
  ].sort((a, b) => Date.parse(b.date)-Date.parse(a.date));
  const lastActivity =
    [
      ...activity.map((a) => a.date),
      ...data.practice.map((s) => s.started_at),
      ...data.tests.map((s) => s.started_at),
      ...data.exams.map((s) => s.started_at),
      ...data.submissions.map((s) => s.started_at),
      ...data.practiceAnswers.map((a) => a.created_at),
      ...data.testAnswers.map((a) => a.created_at),
    ]
      .filter((d): d is string => Boolean(d) && Number.isFinite(Date.parse(d)))
      .sort((a,b)=>Date.parse(a)-Date.parse(b))
      .at(-1) ?? null;
  return {
    lastActivity,
    tests,
    skills: [...skillMap.values()].sort((a, b) => a.accuracy - b.accuracy),
    answered: graded.length,
    accuracy: graded.length
      ? Math.round(
          (100 * graded.filter((a) => a.is_correct).length) / graded.length,
        )
      : null,
    timing: data.practiceAnswers
      .filter((a) => a.is_correct === true && a.time_spent_seconds !== null)
      .map((a) => ({ date: a.created_at, seconds: a.time_spent_seconds! })),
    activity,
    homework: {
      onTime,
      late,
      missing,
      average: percentages.length
        ? Math.round(
            percentages.reduce((a, b) => a + b, 0) / percentages.length,
          )
        : null,
    },
  };
}
