import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadHomeworkAttempt, saveHomeworkAnswer, submitHomeworkAttempt } from "@/lib/server/homeworkAttempts";

const startSchema = z.object({ action: z.literal("start"), assignmentId: z.uuid() });
const getSchema = z.object({ action: z.literal("get"), submissionId: z.uuid() });
const answerSchema = z.object({
  action: z.literal("answer"),
  answer: z.string().trim().min(1).max(500),
  questionId: z.uuid(),
  submissionId: z.uuid(),
  timeSpentSeconds: z.number().int().min(0).max(86400).nullable().optional()
});
const submitSchema = z.object({ action: z.literal("submit"), submissionId: z.uuid() });
const payloadSchema = z.union([startSchema, getSchema, answerSchema, submitSchema]);

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Войдите, чтобы выполнить задание." }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  try {
    const input = parsed.data;

    if (input.action === "start") {
      const { data: submissionId, error } = await getSupabaseAdminClient().rpc("start_assignment_attempt", {
        p_assignment: input.assignmentId,
        p_user: userId
      });
      if (error || !submissionId) {
        return NextResponse.json({ error: "Это задание недоступно для выполнения." }, { status: 409 });
      }
      return NextResponse.json(await loadHomeworkAttempt(userId, submissionId), {
        headers: { "Cache-Control": "no-store" }
      });
    }

    if (input.action === "get") {
      return NextResponse.json(await loadHomeworkAttempt(userId, input.submissionId), {
        headers: { "Cache-Control": "no-store" }
      });
    }

    if (input.action === "answer") {
      await saveHomeworkAnswer({
        answer: input.answer,
        questionId: input.questionId,
        submissionId: input.submissionId,
        timeSpentSeconds: input.timeSpentSeconds ?? null,
        userId
      });
      return NextResponse.json({ saved: true });
    }

    return NextResponse.json(await submitHomeworkAttempt({ submissionId: input.submissionId, userId }), {
      headers: { "Cache-Control": "no-store" }
    });
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить задание. Попробуйте ещё раз." }, { status: 500 });
  }
}
