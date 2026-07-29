import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import {
  getQuestionSolution,
  getReviewQuestions
} from "@/lib/server/questionSolutions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const completeTestSchema = z.object({
  answers: z.record(z.string().uuid(), z.string().trim().max(500).nullable()),
  testSessionId: z.string().uuid().nullable().optional(),
  timeSpentSeconds: z.number().int().min(0).max(24 * 60 * 60)
});

export async function POST(request: NextRequest) {
  try {
    const parsed = completeTestSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid test completion payload." }, { status: 400 });
    }

    const answers = parsed.data.answers;
    const questionIds = Object.keys(answers);
    const solutions = await Promise.all(
      questionIds.map(async (questionId) => ({
        questionId,
        solution: await getQuestionSolution(questionId)
      }))
    );
    const score = solutions.filter(
      ({ questionId, solution }) =>
        answers[questionId] !== null &&
        normalizeAnswer(answers[questionId] ?? "") === normalizeAnswer(solution.correct_answer)
    ).length;
    const total = questionIds.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const estimatedSatScore = Math.min(1600, Math.max(400, 400 + Math.round(percentage * 12)));
    const reviewQuestions = await getReviewQuestions(answers);
    const userId = await getAuthenticatedUserId(request);

    if (userId && parsed.data.testSessionId) {
      await saveVerifiedTestResult({
        answers,
        estimatedSatScore,
        percentage,
        score,
        solutions,
        testSessionId: parsed.data.testSessionId,
        timeSpentSeconds: parsed.data.timeSpentSeconds,
        total,
        userId
      });
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
  total,
  userId
}: {
  answers: Record<string, string | null>;
  estimatedSatScore: number;
  percentage: number;
  score: number;
  solutions: Array<{ questionId: string; solution: { correct_answer: string } }>;
  testSessionId: string;
  timeSpentSeconds: number;
  total: number;
  userId: string;
}) {
  const supabase = getSupabaseAdminClient();
  const { data: session } = await supabase
    .from("test_sessions")
    .select("id,user_id")
    .eq("id", testSessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!session) {
    return;
  }

  await Promise.all(
    solutions.map(({ questionId, solution }) =>
      supabase
        .from("test_answers")
        .upsert(
          {
            correct_answer: solution.correct_answer,
            is_correct:
              answers[questionId] !== null &&
              normalizeAnswer(answers[questionId] ?? "") ===
                normalizeAnswer(solution.correct_answer),
            question_id: questionId,
            selected_answer: answers[questionId],
            test_session_id: testSessionId,
            user_id: userId
          },
          { onConflict: "test_session_id,question_id" }
        )
    )
  );

  await supabase
    .from("test_sessions")
    .update({
      completed_at: new Date().toISOString(),
      estimated_sat_score: estimatedSatScore,
      percentage,
      score,
      time_spent_seconds: timeSpentSeconds,
      total
    })
    .eq("id", testSessionId)
    .eq("user_id", userId);
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}
