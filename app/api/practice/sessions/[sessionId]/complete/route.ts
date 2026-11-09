import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadQuestionPages } from "@/lib/supabase/questionPagination";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { sessionId } = await context.params;
    if (!z.uuid().safeParse(sessionId).success) {
      return NextResponse.json({ error: "Invalid practice session." }, { status: 400 });
    }
    const supabase = getSupabaseAdminClient();
    const { data: session, error: sessionError } = await supabase
      .from("practice_sessions")
      .select("id,total,user_id,completed_at,percentage,score")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) {
      return NextResponse.json({ error: "Practice session not found." }, { status: 404 });
    }

    if (session.completed_at) {
      return NextResponse.json({ id: session.id, total: session.total, score: session.score, percentage: session.percentage });
    }
    const { data: answers, error: answersError } = await loadQuestionPages((from, to, withCount) =>
      supabase.from("practice_answers")
        .select("question_id,is_correct", withCount ? { count: "exact" } : undefined)
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .order("created_at").order("id").range(from, to)
    );

    if (answersError) {
      throw new Error("Unable to load answers.");
    }

    const latestByQuestion = new Map<string, boolean>();

    (answers ?? []).forEach((answer) => {
      if (answer.is_correct !== null) {
        latestByQuestion.set(answer.question_id, answer.is_correct);
      }
    });

    const score = Array.from(latestByQuestion.values()).filter(Boolean).length;
    const total = Math.max(session.total, latestByQuestion.size);
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const { data: updatedSession, error: updateError } = await supabase
      .from("practice_sessions")
      .update({
        completed_at: new Date().toISOString(),
        percentage,
        score,
        total
      })
      .eq("id", sessionId)
      .eq("user_id", userId)
      .is("completed_at", null)
      .select("id,percentage,score,total")
      .maybeSingle();

    if (updateError) {
      throw new Error("Unable to complete practice session.");
    }

    if (!updatedSession) return NextResponse.json({ error: "Practice session already completed." }, { status: 409 });
    return NextResponse.json(updatedSession);
  } catch {
    return NextResponse.json(
      { error: "Unable to complete this practice session right now." },
      { status: 500 }
    );
  }
}
