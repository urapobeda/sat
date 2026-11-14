export type AssignmentKind = "question_set" | "past_paper";
export type ShowAnswersRule = "after_submit" | "after_due" | "never";
export type SubmissionStatus = "in_progress" | "submitted";

export type StudentAssignment = {
  feedback_submission_id?: string | null;
  id: string;
  group_id: string;
  group_name: string;
  title: string;
  instructions: string;
  kind: AssignmentKind;
  paper_id: string | null;
  paper_slug: string | null;
  paper_title: string | null;
  time_limit_minutes: number | null;
  due_at: string;
  show_answers: ShowAnswersRule;
  max_attempts: number;
  created_at: string;
  total_questions: number | null;
  attempt_no: number | null;
  status: SubmissionStatus | null;
  started_at: string | null;
  submitted_at: string | null;
  correct_count: number | null;
  total_count: number | null;
  answered_count: number | null;
};

export type TeacherAssignment = {
  id: string;
  group_id: string;
  group_name: string;
  title: string;
  kind: AssignmentKind;
  paper_id: string | null;
  paper_slug: string | null;
  paper_title: string | null;
  due_at: string;
  show_answers: ShowAnswersRule;
  max_attempts: number;
  published: boolean;
  created_at: string;
  total_questions: number | null;
  group_size: number;
  submitted_count: number | null;
};

export type AssignmentRosterRow = {
  student_id: string;
  full_name: string;
  attempt_no: number | null;
  status: SubmissionStatus | null;
  started_at: string | null;
  submitted_at: string | null;
  correct_count: number | null;
  total_count: number | null;
};

export type AssignmentQuestionRow = { assignment_id: string; question_id: string; position: number };

export type AssignmentSubmission = {
  id: string;
  assignment_id: string;
  student_id: string;
  attempt_no: number;
  status: SubmissionStatus;
  started_at: string;
  submitted_at: string | null;
  correct_count: number | null;
  total_count: number | null;
};

export type AssignmentAnswer = {
  submission_id: string;
  question_id: string;
  answer: string | null;
  is_correct: boolean | null;
  time_spent_seconds: number | null;
  answered_at: string;
};

export function isPastDue(dueAtIso: string, referenceDateMs: number = Date.now()) {
  return referenceDateMs > new Date(dueAtIso).getTime();
}

export function canRevealAnswers(rule: ShowAnswersRule, dueAtIso: string, submitted: boolean) {
  if (!submitted) return false;
  if (rule === "never") return false;
  if (rule === "after_submit") return true;
  return isPastDue(dueAtIso);
}
