import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getReviewQuestions, gradeQuestionAnswer, toQuestionChoices } from "@/lib/server/questionSolutions";
import { canRevealAnswers, type ShowAnswersRule, type SubmissionStatus } from "@/lib/homework";
import type { AssignmentFeedback } from "@/lib/assignmentReport";
import type { Choice } from "@/types/database";
import type { Question, ReviewQuestion } from "@/types/sat";

const PUBLIC_QUESTION_COLUMNS = "id,section,topic,difficulty,question,choices,is_bluebook,image_urls,question_type";

export type HomeworkAttemptSnapshot = {
  submissionId: string;
  assignmentId: string;
  title: string;
  instructions: string;
  timeLimitMinutes: number | null;
  dueAt: string | null;
  showAnswers: ShowAnswersRule;
  status: SubmissionStatus;
  startedAt: string;
  submittedAt: string | null;
  correctCount: number | null;
  totalCount: number | null;
  late: boolean;
  questions: Question[];
  answers: Record<string, string>;
  review: ReviewQuestion[] | null;
  feedback: AssignmentFeedback[];
  feedbackError: boolean;
  answerTimes: Record<string, number | null>;
  canRetake: boolean;
};

export async function loadHomeworkAttempt(userId: string, submissionId: string): Promise<HomeworkAttemptSnapshot> {
  const client = getSupabaseAdminClient();
  const expired = await client.rpc("expire_assignment_attempt", {p_user:userId,p_submission:submissionId});
  if (expired.error) throw new Error("Attempt unavailable");
  const { data: submission, error } = await client
    .from("assignment_submissions")
    .select("*")
    .eq("id", submissionId)
    .eq("student_id", userId)
    .maybeSingle();
  if (error || !submission) throw new Error("Attempt unavailable");

  const { data: assignment, error: assignmentError } = await client
    .from("assignments")
    .select("*")
    .eq("id", submission.assignment_id)
    .maybeSingle();
  if (assignmentError || !assignment) throw new Error("Attempt unavailable");

  const { data: links, error: linksError } = await client
    .from("assignment_questions")
    .select("question_id,position")
    .eq("assignment_id", assignment.id)
    .order("position");
  if (linksError || !links?.length) throw new Error("Attempt unavailable");

  const ids = links.map((link) => link.question_id);
  const { data: questionRows, error: questionsError } = await client
    .from("questions")
    .select(PUBLIC_QUESTION_COLUMNS)
    .in("id", ids);
  if (questionsError || !questionRows) throw new Error("Attempt unavailable");

  const byId = new Map(questionRows.map((row) => [row.id, row]));
  const questions: Question[] = ids.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    const choices = toQuestionChoices((row.choices ?? []) as Choice[]);
    return [
      {
        choices,
        difficulty: row.difficulty,
        id: row.id,
        imageUrls: row.image_urls ?? [],
        isBluebook: row.is_bluebook ?? false,
        question: row.question,
        questionType: row.question_type ?? (choices.length > 0 ? "multiple-choice" : "student-produced-response"),
        section: row.section,
        topic: row.topic
      }
    ];
  });

  const { data: answerRows, error: answersError } = await client
    .from("assignment_answers")
    .select("question_id,answer,time_spent_seconds")
    .eq("submission_id", submissionId);
  if (answersError) throw new Error("Attempt unavailable");

  const answers = Object.fromEntries(
    (answerRows ?? [])
      .filter((row) => row.answer !== null)
      .map((row) => [row.question_id, row.answer!])
  );

  const submitted = submission.status === "submitted";
  const release = await client.rpc("assignment_answers_released", {p_assignment:assignment.id,p_student:userId});
  if (release.error) throw new Error("Could not check answer visibility");
  const reveal = canRevealAnswers(assignment.show_answers, assignment.due_at, submitted) && release.data === true;
  const review = reveal
    ? await getReviewQuestions(Object.fromEntries(ids.map((id) => [id, answers[id] ?? null])))
    : null;

  const [feedback, grants, attempts, member] = await Promise.all([
    client.from("assignment_feedback").select("*").eq("submission_id", submissionId).order("created_at"),
    client.from("assignment_retake_grants").select("submission_id", { count: "exact", head: true }).eq("assignment_id", assignment.id).eq("student_id", userId),
    client.from("assignment_submissions").select("id", { count: "exact", head: true }).eq("assignment_id", assignment.id).eq("student_id", userId),
    client.from("group_members").select("student_id").eq("group_id", assignment.group_id).eq("student_id", userId).maybeSingle()
  ]);
  return {
    feedback: submitted && !feedback.error ? feedback.data ?? [] : [],
    feedbackError: submitted && Boolean(feedback.error),
    answerTimes: Object.fromEntries((answerRows ?? []).map((row) => [row.question_id, row.time_spent_seconds])),
    canRetake: submitted && assignment.published && !grants.error && !attempts.error && !member.error && Boolean(member.data)
      && (attempts.count ?? 0) < assignment.max_attempts + (grants.count ?? 0),
    submissionId: submission.id,
    assignmentId: assignment.id,
    title: assignment.title,
    instructions: assignment.instructions,
    timeLimitMinutes: assignment.time_limit_minutes,
    dueAt: assignment.due_at,
    showAnswers: assignment.show_answers,
    status: submission.status,
    startedAt: submission.started_at,
    submittedAt: submission.submitted_at,
    correctCount: submission.correct_count,
    totalCount: submission.total_count,
    late: Boolean(submission.submitted_at && assignment.due_at && new Date(submission.submitted_at) > new Date(assignment.due_at)),
    questions,
    answers,
    review
  };
}

export async function saveHomeworkAnswer({
  answer,
  questionId,
  submissionId,
  timeSpentSeconds,
  userId
}: {
  answer: string | null;
  questionId: string;
  submissionId: string;
  timeSpentSeconds: number | null;
  userId: string;
}) {
  const feedback = answer === null ? null : await gradeQuestionAnswer({ questionId, selectedAnswer: answer });
  const { error } = await getSupabaseAdminClient().rpc("save_verified_assignment_answer", {
    p_user: userId, p_submission: submissionId, p_question: questionId,
    p_answer: answer, p_correct: feedback?.isCorrect ?? null, p_seconds: timeSpentSeconds
  });
  if (error) throw new Error("Unable to save answer");
  const state = await getSupabaseAdminClient().from("assignment_submissions").select("status").eq("id",submissionId).eq("student_id",userId).single();
  if (state.error) throw new Error("Unable to confirm saved answer");
  if (state.data.status === "submitted") throw new Error("HOMEWORK_EXPIRED");
}

export async function submitHomeworkAttempt({ submissionId, userId }: { submissionId: string; userId: string }) {
  const { error } = await getSupabaseAdminClient().rpc("finalize_assignment_submission", { p_user: userId, p_submission: submissionId });
  if (error) throw new Error("Unable to submit attempt");
  return loadHomeworkAttempt(userId, submissionId);
}

export async function openHomeworkAttempt(userId: string, assignmentId: string, newAttempt = false) {
  const client = getSupabaseAdminClient();
  const latest = await client.from("assignment_submissions").select("id,status").eq("assignment_id", assignmentId).eq("student_id", userId).order("attempt_no", { ascending: false }).limit(1).maybeSingle();
  if (latest.error) throw new Error("Attempt unavailable");
  if (latest.data && (!newAttempt || latest.data.status === "in_progress")) return loadHomeworkAttempt(userId, latest.data.id);
  const result = await client.rpc("start_assignment_attempt", { p_user: userId, p_assignment: assignmentId });
  if (result.error || !result.data) throw new Error("No attempts available");
  return loadHomeworkAttempt(userId, result.data);
}
