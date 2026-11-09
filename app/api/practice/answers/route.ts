import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { gradeQuestionAnswer } from "@/lib/server/questionSolutions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { countedAnswerSeconds } from "@/lib/practiceTiming";

const answerSchema = z.object({
  questionId: z.string().uuid(),
  selectedAnswer: z.string().trim().min(1).max(500),
  sessionId: z.string().uuid().nullable().optional(),
  timeSpentSeconds: z.number().int().min(0).max(86400).nullable().optional()
});

export async function POST(request: NextRequest) {
  try {
    const parsed = answerSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid answer payload." }, { status: 400 });
    }

    const sessionId = parsed.data.sessionId;
    const [owner, feedback] = await Promise.all([
      sessionId ? getPracticeSessionOwner(request, sessionId).catch((error: unknown) => {
        logPersistenceError(error);
        return null;
      }) : null,
      gradeQuestionAnswer({
        questionId: parsed.data.questionId,
        selectedAnswer: parsed.data.selectedAnswer
      })
    ]);

    let persistence = { answerSaved: false, timingRecorded: false };
    if (owner && sessionId) {
      try {
        persistence = await saveVerifiedPracticeAnswer({
          feedback,
          questionId: parsed.data.questionId,
          selectedAnswer: parsed.data.selectedAnswer,
          sessionId,
          timeSpentSeconds: parsed.data.timeSpentSeconds ?? null,
          ...owner
        });
      } catch (error) {
        logPersistenceError(error);
      }
    }

    if (!feedback.isCorrect) {
      return NextResponse.json({ isCorrect: false, answerSaved: persistence.answerSaved, timingRecorded: false });
    }

    return NextResponse.json({ ...feedback, ...persistence });
  } catch {
    return NextResponse.json(
      { error: "Unable to verify this answer right now." },
      { status: 500 }
    );
  }
}

function logPersistenceError(error: unknown) {
  console.error("Practice answer persistence failed:", error instanceof Error ? error.message : "Request failed");
}

async function getPracticeSessionOwner(request: NextRequest, sessionId: string) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return null;
  const supabase = getSupabaseAdminClient();
  const { data: session, error } = await supabase
    .from("practice_sessions")
    .select("id,user_id,completed_at")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return session && !session.completed_at ? { supabase, userId } : null;
}

async function saveVerifiedPracticeAnswer({
  feedback,
  questionId,
  selectedAnswer,
  sessionId,
  supabase,
  timeSpentSeconds,
  userId
}: {
  feedback: { correctAnswer: string; isCorrect: boolean };
  questionId: string;
  selectedAnswer: string;
  sessionId: string;
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  timeSpentSeconds: number | null;
  userId: string;
}) {
  const countedSeconds = countedAnswerSeconds(feedback.isCorrect, timeSpentSeconds);
  const row = {
    correct_answer: feedback.isCorrect ? feedback.correctAnswer : null,
    is_correct: feedback.isCorrect,
    question_id: questionId,
    selected_answer: selectedAnswer,
    session_id: sessionId,
    time_spent_seconds: countedSeconds,
    user_id: userId
  };
  const { error } = await supabase.from("practice_answers").upsert(row, { onConflict: "session_id,question_id" });
  if (error && /time_spent_seconds/.test(error.message) && /column|schema cache/i.test(error.message)) {
    // Keep grading and answer history working until the timing migration is applied.
    const legacyRow = { ...row };
    delete (legacyRow as Partial<typeof row>).time_spent_seconds;
    const retry = await supabase.from("practice_answers").upsert(legacyRow, { onConflict: "session_id,question_id" });
    if (retry.error) throw new Error(retry.error.message);
    return { answerSaved: true, timingRecorded: false };
  }
  if (error) throw new Error(error.message);
  return { answerSaved: true, timingRecorded: countedSeconds !== null };
}
