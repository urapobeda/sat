import { NextRequest, NextResponse } from "next/server";
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
    const supabase = getSupabaseAdminClient();
    const { data: session } = await supabase
      .from("practice_sessions")
      .select("id,total,user_id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "Practice session not found." }, { status: 404 });
    }

    const { data: answers, error: answersError } = await supabase
      .from("practice_answers")
      .select("question_id,is_correct")
      .eq("session_id", sessionId)
      .eq("user_id", userId);

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
    const total = session.total || latestByQuestion.size;
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
      .select("id,percentage,score,total")
      .single();

    if (updateError) {
      throw new Error("Unable to complete practice session.");
    }

    return NextResponse.json(updatedSession);
  } catch {
    return NextResponse.json(
      { error: "Unable to complete this practice session right now." },
      { status: 500 }
    );
  }
}
