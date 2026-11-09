import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import {
  getReviewQuestions,
  isAnswerCorrect,
  loadGradingData
} from "@/lib/server/questionSolutions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const completeTestSchema = z.object({
  answers: z.record(z.string().uuid(), z.string().trim().min(1).max(500).nullable()).refine((answers) => {
    const count = Object.keys(answers).length;
    return count > 0 && count <= 98;
  }),
  testSessionId: z.string().uuid().nullable().optional(),
  timeSpentSeconds: z.number().int().min(0).max(24 * 60 * 60)
});

export async function POST(request: NextRequest) {
  try {
    const parsed = completeTestSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid test completion payload." }, { status: 400 });
    }

    const answers = parsed.data.answers;
    const questionIds = Object.keys(answers);
    const userId = await getAuthenticatedUserId(request);
    const sessionId = parsed.data.testSessionId;
    if (sessionId && !userId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    if (sessionId && userId) {
      const { data: session, error } = await getSupabaseAdminClient()
        .from("test_sessions")
        .select("total,completed_at")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!session) return NextResponse.json({ error: "Test session not found." }, { status: 404 });
      if (session.completed_at || session.total !== questionIds.length) {
        return NextResponse.json({ error: "This test session cannot be submitted." }, { status: 409 });
      }
    }
    const gradingById = await loadGradingData(questionIds);
    if (gradingById.size !== questionIds.length) {
      return NextResponse.json({ error: "Some test questions are unavailable." }, { status: 400 });
    }
    const solutions = questionIds.flatMap((questionId) => {
      const grading = gradingById.get(questionId);

      return grading
        ? [
            {
              isCorrect: isAnswerCorrect(grading, answers[questionId] ?? null),
              questionId,
              solution: { correct_answer: grading.correctAnswer }
            }
          ]
        : [];
    });
    const score = solutions.filter((solution) => solution.isCorrect).length;
    const total = questionIds.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const estimatedSatScore = Math.min(1600, Math.max(400, 400 + Math.round(percentage * 12)));
    const submittedAnswers = Object.fromEntries(Object.entries(answers).filter(([, answer]) => answer !== null));
    const reviewQuestions = await getReviewQuestions(submittedAnswers);

    if (userId && parsed.data.testSessionId) {
      const saved = await saveVerifiedTestResult({
        answers,
        estimatedSatScore,
        percentage,
        score,
        solutions,
        testSessionId: parsed.data.testSessionId,
        timeSpentSeconds: parsed.data.timeSpentSeconds,
        userId
      });
      if (!saved) return NextResponse.json({ error: "This test session was already submitted." }, { status: 409 });
    }

    return NextResponse.json({
      estimatedSatScore,
      percentage,
      reviewQuestions,
      score,
      total
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to complete this test right now." },
      { status: 500 }
    );
  }
}

async function saveVerifiedTestResult({
  answers,
  estimatedSatScore,
  percentage,
  score,
  solutions,
  testSessionId,
  timeSpentSeconds,
  userId
}: {
  answers: Record<string, string | null>;
  estimatedSatScore: number;
  percentage: number;
  score: number;
  solutions: Array<{ isCorrect: boolean; questionId: string; solution: { correct_answer: string } }>;
  testSessionId: string;
  timeSpentSeconds: number;
  userId: string;
}) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("finalize_verified_test", {
    p_session: testSessionId,
    p_user: userId,
    p_answers: solutions.map(({ isCorrect, questionId, solution }) => ({
      correct_answer: solution.correct_answer,
      is_correct: isCorrect,
      question_id: questionId,
      selected_answer: answers[questionId]
    })),
    p_estimate: estimatedSatScore,
    p_percentage: percentage,
    p_score: score,
    p_seconds: timeSpentSeconds
  });
  if (error) throw error;
  return data;
}
