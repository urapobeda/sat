import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getReviewQuestions, gradeQuestionAnswer, toQuestionChoices } from "@/lib/server/questionSolutions";
import { canRevealAnswers, type ShowAnswersRule, type SubmissionStatus } from "@/lib/homework";
import type { Choice } from "@/types/database";
import type { Question, ReviewQuestion } from "@/types/sat";

const PUBLIC_QUESTION_COLUMNS = "id,section,topic,difficulty,question,choices,is_bluebook,image_urls,question_type";

export type HomeworkAttemptSnapshot = {
  submissionId: string;
  assignmentId: string;
  title: string;
  instructions: string;
  timeLimitMinutes: number | null;
  dueAt: string;
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
};

export async function loadHomeworkAttempt(userId: string, submissionId: string): Promise<HomeworkAttemptSnapshot> {
  const client = getSupabaseAdminClient();
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
    .select("question_id,answer")
    .eq("submission_id", submissionId);
  if (answersError) throw new Error("Attempt unavailable");

  const answers = Object.fromEntries(
    (answerRows ?? [])
      .filter((row): row is { question_id: string; answer: string } => row.answer !== null)
      .map((row) => [row.question_id, row.answer])
  );

  const submitted = submission.status === "submitted";
  const reveal = canRevealAnswers(assignment.show_answers, assignment.due_at, submitted);
  const review = reveal
    ? await getReviewQuestions(Object.fromEntries(ids.map((id) => [id, answers[id] ?? null])))
    : null;

  return {
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
    late: Boolean(submission.submitted_at && new Date(submission.submitted_at) > new Date(assignment.due_at)),
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
  answer: string;
  questionId: string;
  submissionId: string;
  timeSpentSeconds: number | null;
  userId: string;
}) {
  const client = getSupabaseAdminClient();
  const { data: submission, error } = await client
    .from("assignment_submissions")
    .select("id,assignment_id,status")
    .eq("id", submissionId)
    .eq("student_id", userId)
    .maybeSingle();
  if (error || !submission) throw new Error("Attempt unavailable");
  if (submission.status !== "in_progress") throw new Error("This attempt was already submitted.");

  const { data: link, error: linkError } = await client
    .from("assignment_questions")
    .select("question_id")
    .eq("assignment_id", submission.assignment_id)
    .eq("question_id", questionId)
    .maybeSingle();
  if (linkError || !link) throw new Error("Question is not part of this assignment.");

  const feedback = await gradeQuestionAnswer({ questionId, selectedAnswer: answer });
  const { error: upsertError } = await client.from("assignment_answers").upsert(
    {
      answer,
      answered_at: new Date().toISOString(),
      is_correct: feedback.isCorrect,
      question_id: questionId,
      submission_id: submissionId,
      time_spent_seconds: timeSpentSeconds
    },
    { onConflict: "submission_id,question_id" }
  );
  if (upsertError) throw new Error(upsertError.message);
}

export async function submitHomeworkAttempt({ submissionId, userId }: { submissionId: string; userId: string }) {
  const client = getSupabaseAdminClient();
  const { data: submission, error } = await client
    .from("assignment_submissions")
    .select("id,assignment_id,status")
    .eq("id", submissionId)
    .eq("student_id", userId)
    .maybeSingle();
  if (error || !submission) throw new Error("Attempt unavailable");
  if (submission.status === "submitted") return loadHomeworkAttempt(userId, submissionId);

  const { count: totalCount, error: totalError } = await client
    .from("assignment_questions")
    .select("question_id", { count: "exact", head: true })
    .eq("assignment_id", submission.assignment_id);
  if (totalError) throw new Error(totalError.message);

  const { count: correctCount, error: correctError } = await client
    .from("assignment_answers")
    .select("question_id", { count: "exact", head: true })
    .eq("submission_id", submissionId)
    .eq("is_correct", true);
  if (correctError) throw new Error(correctError.message);

  await client
    .from("assignment_submissions")
    .update({
      correct_count: correctCount ?? 0,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      total_count: totalCount ?? 0
    })
    .eq("id", submissionId)
    .eq("status", "in_progress");

  return loadHomeworkAttempt(userId, submissionId);
}
