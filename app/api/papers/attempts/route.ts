import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { gradePaperModule, loadPaperAttempt } from "@/lib/server/paperAttempts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const openSchema = z.object({ action: z.literal("open"), slug: z.string().regex(/^[a-z0-9-]{1,150}$/), section: z.enum(["full", "math", "reading-writing"]) });
const getSchema = z.object({ action: z.literal("get"), attemptId: z.uuid() });
const saveSchema = z.object({
  action: z.enum(["save", "submit"]), attemptId: z.uuid(), moduleId: z.uuid(),
  revision: z.number().int().min(0), index: z.number().int().min(0).max(26),
  answers: z.record(z.uuid(), z.string().max(100)).refine((value) => Object.keys(value).length <= 27),
  flags: z.record(z.uuid(), z.boolean()).refine((value) => Object.keys(value).length <= 27)
});
const payloadSchema = z.union([openSchema, getSchema, saveSchema]);

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: "Sign in to take a practice paper." }, { status: 401 });
    const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const input = parsed.data;
    const client = getSupabaseAdminClient();
    if (input.action === "open") {
      const { data: id, error } = await client.rpc("open_paper_attempt", { p_user: userId, p_slug: input.slug, p_section: input.section });
      if (error || !id) return NextResponse.json({ error: "This paper is not ready to start. Please try again later." }, { status: 409 });
      return NextResponse.json(await loadPaperAttempt(userId, id), { headers: { "Cache-Control": "no-store" } });
    }
    if (input.action === "get") return NextResponse.json(await loadPaperAttempt(userId, input.attemptId), { headers: { "Cache-Control": "no-store" } });
    const { data: attempt, error: attemptError } = await client.from("exam_attempts")
      .select("id,current_module_id").eq("id", input.attemptId).eq("user_id", userId).maybeSingle();
    if (attemptError) throw attemptError;
    if (!attempt) return NextResponse.json({ error: "Attempt unavailable." }, { status: 404 });
    const { data: current, error: currentError } = await client.from("paper_module_runs")
      .select("completed_at").eq("attempt_id", attempt.id).eq("module_id", input.moduleId).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({ error: "Module unavailable." }, { status: 404 });
    if (current.completed_at) {
      if (input.action === "save") return NextResponse.json({ error: "This module was submitted in another tab. Reload to continue." }, { status: 409 });
      return NextResponse.json(await loadPaperAttempt(userId, input.attemptId));
    }
    if (attempt.current_module_id !== input.moduleId) return NextResponse.json({ error: "This module is locked." }, { status: 409 });
    const args = {
      p_user: userId, p_attempt: input.attemptId, p_module: input.moduleId,
      p_revision: input.revision, p_answers: input.answers, p_flags: input.flags,
      p_index: input.index, p_submit: false, p_graded: {} as Record<string, boolean>
    };
    const saved = await client.rpc("update_paper_attempt", args);
    if (saved.error) throw saved.error;
    if (!saved.data) return NextResponse.json({ error: "This attempt changed in another tab or device. Reload to continue." }, { status: 409 });
    if (input.action === "save") {
      const { data: run, error } = await client.from("paper_module_runs").select("revision,answers,flags,current_index,deadline")
        .eq("attempt_id", input.attemptId).eq("module_id", input.moduleId).single();
      if (error) throw error;
      if (run.revision > input.revision + 1) return NextResponse.json({ error: "This attempt changed in another tab. Reload to continue." }, { status: 409 });
      return NextResponse.json(run, { headers: { "Cache-Control": "no-store" } });
    }
    const { data: run, error } = await client.from("paper_module_runs").select("*")
      .eq("attempt_id", input.attemptId).eq("module_id", input.moduleId).single();
    if (error) throw error;
    const graded = await gradePaperModule(input.moduleId, run.answers);
    const submitted = await client.rpc("update_paper_attempt", { ...args, p_revision: run.revision, p_submit: true, p_graded: graded });
    if (submitted.error) throw submitted.error;
    if (!submitted.data) return NextResponse.json({ error: "Your answers changed while submitting. Please submit again." }, { status: 409 });
    return NextResponse.json(await loadPaperAttempt(userId, input.attemptId), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "This attempt could not be saved. Your local draft is retained. Try again." }, { status: 500 });
  }
}
