import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { gradeQuestionAnswer } from "@/lib/server/questionSolutions";
import { liveActor, liveError, readLiveSnapshot, validLiveCode } from "@/lib/server/liveAccess";
type Context = { params: Promise<{ code: string }> };
const answerSchema = z.object({ sessionId: z.uuid(), questionId: z.uuid(), choice: z.string().trim().min(1).max(200) });
export async function GET(request: NextRequest, context: Context) {
  const actor = await liveActor(request);
  if (!actor) return NextResponse.json({ error: "Sign in to join live practice." }, { status: 401 });
  const { code } = await context.params;
  if (!validLiveCode(code)) return NextResponse.json({ error: "Invalid live practice code." }, { status: 400 });
  try { return NextResponse.json(await readLiveSnapshot(actor.db, code), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return liveError(error); }
}
export async function POST(request: NextRequest, context: Context) {
  const actor = await liveActor(request);
  if (!actor || actor.actor.role !== "student") return NextResponse.json({ error: "Only group students can submit live answers." }, { status: 403 });
  const { code } = await context.params;
  const body = answerSchema.safeParse(await request.json().catch(() => null));
  if (!validLiveCode(code) || !body.success) return NextResponse.json({ error: "Choose or enter a valid answer." }, { status: 400 });
  try {
    // This user-context read establishes membership before any privileged grading.
    const snapshot = await readLiveSnapshot(actor.db, code);
    const { sessionId, questionId, choice } = body.data;
    if (snapshot.session.id !== sessionId || snapshot.question.id !== questionId || snapshot.session.status !== "active" || snapshot.session.revealed_positions.includes(snapshot.session.current_position))
      return liveError({ code: "40001" });
    if (snapshot.question.choices.length && !snapshot.question.choices.some(option => option.label === choice)) return NextResponse.json({ error: "Choose one of the answer options." }, { status: 400 });
    const feedback = await gradeQuestionAnswer({ questionId, selectedAnswer: choice });
    const saved = await getSupabaseAdminClient().rpc("submit_verified_live_answer", { p_student: actor.actor.id, p_session: sessionId, p_question: questionId, p_choice: choice, p_correct: feedback.isCorrect });
    if (saved.error) throw saved.error;
    // Never serialize feedback, correct answers or explanations into this response.
    return NextResponse.json({ saved: true });
  } catch (error) { return liveError(error); }
}
