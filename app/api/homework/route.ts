import { NextResponse, type NextRequest } from "next/server";
import { getApiRoleActor } from "@/lib/server/roles";
import { getSupabaseUserClient } from "@/lib/server/userClient";
import type { StudentAssignment } from "@/lib/homework";

export async function GET(request: NextRequest) {
  const actor = await getApiRoleActor(request);
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getSupabaseUserClient(request.headers.get("authorization")!.slice(7));

  try {
    const refreshed = await db.rpc("refresh_my_assignment_deadlines");
    if (refreshed.error) throw refreshed.error;
    const { data, error } = await db.rpc("list_student_assignments");
    if (error) throw error;
    const assignments = (data ?? []) as StudentAssignment[];
    const feedback = await db.rpc("list_my_assignment_feedback");
    if (!feedback.error) for (const item of assignments) {
      item.feedback_submission_id = feedback.data?.find((entry) => entry.assignment_id === item.id)?.submission_id ?? null;
    }
    await enrichPastPaperAssignments(db, actor.id, assignments);
    return NextResponse.json({ assignments }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load homework." }, { status: 503 });
  }
}

/** Past-paper homework reuses the existing exam_attempts system instead of assignment_submissions. */
async function enrichPastPaperAssignments(
  db: ReturnType<typeof getSupabaseUserClient>,
  userId: string,
  assignments: StudentAssignment[]
) {
  const paperIds = [...new Set(assignments.filter((a) => a.kind === "past_paper" && a.paper_id).map((a) => a.paper_id as string))];
  if (paperIds.length === 0) return;

  const [{ data: attempts, error: attemptsError }, { data: modules, error: modulesError }] = await Promise.all([
    db
      .from("exam_attempts")
      .select("paper_id,status,completed_at,started_at,raw_score")
      .eq("user_id", userId)
      .in("paper_id", paperIds),
    db.from("exam_modules").select("paper_id,question_count").in("paper_id", paperIds)
  ]);
  if (attemptsError || modulesError) throw attemptsError ?? modulesError;

  const totalByPaper = new Map<string, number>();
  for (const examModule of modules ?? []) {
    totalByPaper.set(examModule.paper_id, (totalByPaper.get(examModule.paper_id) ?? 0) + examModule.question_count);
  }

  const latestByPaper = new Map<string, NonNullable<typeof attempts>[number]>();
  for (const attempt of attempts ?? []) {
    const existing = latestByPaper.get(attempt.paper_id);
    const rank = (value: typeof attempt) => new Date(value.completed_at ?? value.started_at).getTime();
    if (!existing || rank(attempt) > rank(existing)) latestByPaper.set(attempt.paper_id, attempt);
  }

  for (const assignment of assignments) {
    if (assignment.kind !== "past_paper" || !assignment.paper_id) continue;
    assignment.total_questions = totalByPaper.get(assignment.paper_id) ?? null;
    assignment.total_count = assignment.total_questions;
    const attempt = latestByPaper.get(assignment.paper_id);
    if (!attempt) continue;
    const attemptTime = new Date(attempt.completed_at ?? attempt.started_at).getTime();
    if (attemptTime < new Date(assignment.created_at).getTime()) continue;
    assignment.attempt_no = 1;
    assignment.started_at = attempt.started_at;
    assignment.status = attempt.status === "completed" ? "submitted" : "in_progress";
    assignment.submitted_at = attempt.completed_at;
    assignment.correct_count = attempt.raw_score;
  }
}
