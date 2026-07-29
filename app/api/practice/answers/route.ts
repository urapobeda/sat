import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { gradeQuestionAnswer } from "@/lib/server/questionSolutions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const answerSchema = z.object({
  questionId: z.string().uuid(),
  selectedAnswer: z.string().trim().min(1).max(500),
  sessionId: z.string().uuid().nullable().optional()
});

export async function POST(request: NextRequest) {
  try {
    const parsed = answerSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid answer payload." }, { status: 400 });
    }

    const userId = await getAuthenticatedUserId(request);
    const feedback = await gradeQuestionAnswer({
      questionId: parsed.data.questionId,
      selectedAnswer: parsed.data.selectedAnswer
    });

    if (userId && parsed.data.sessionId) {
      await saveVerifiedPracticeAnswer({
        feedback,
        questionId: parsed.data.questionId,
        selectedAnswer: parsed.data.selectedAnswer,
        sessionId: parsed.data.sessionId,
        userId
      });
    }

    return NextResponse.json(feedback);
  } catch {
    return NextResponse.json(
      { error: "Unable to verify this answer right now." },
      { status: 500 }
    );
  }
}

async function saveVerifiedPracticeAnswer({
  feedback,
  questionId,
  selectedAnswer,
  sessionId,
  userId
}: {
  feedback: { correctAnswer: string; isCorrect: boolean };
  questionId: string;
  selectedAnswer: string;
  sessionId: string;
  userId: string;
}) {
  const supabase = getSupabaseAdminClient();
  const { data: session } = await supabase
    .from("practice_sessions")
    .select("id,user_id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!session) {
    return;
  }

  await supabase
    .from("practice_answers")
    .upsert(
      {
        correct_answer: feedback.correctAnswer,
        is_correct: feedback.isCorrect,
        question_id: questionId,
        selected_answer: selectedAnswer,
        session_id: sessionId,
        user_id: userId
      },
      { onConflict: "session_id,question_id" }
    );
}
