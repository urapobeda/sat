import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getHomeworkStaff, homeworkError } from "@/lib/server/homeworkAccess";
import { loadStudentWork } from "@/lib/server/assignmentReports";
type Context = { params: Promise<{ assignmentId: string; studentId: string }> };
export async function GET(request: NextRequest, context: Context) {
  const staff = await getHomeworkStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { assignmentId, studentId } = await context.params;
  const submission = request.nextUrl.searchParams.get("submission") ?? undefined;
  if (![assignmentId, studentId, ...(submission ? [submission] : [])].every((id) => z.uuid().safeParse(id).success)) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  try { return NextResponse.json(await loadStudentWork(staff, assignmentId, studentId, submission), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return homeworkError(error); }
}
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("comment"), submissionId: z.uuid(), questionId: z.uuid().nullable(), body: z.string().trim().min(1).max(5000) }),
  z.object({ action: z.literal("retake"), submissionId: z.uuid() })
]);
export async function POST(request: NextRequest, context: Context) {
  const staff = await getHomeworkStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { assignmentId, studentId } = await context.params;
  if (![assignmentId, studentId].every((id) => z.uuid().safeParse(id).success)) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the comment and the selected attempt." }, { status: 400 });
  try {
    // All three identifiers are bound together under RLS before any write.
    const sub = await staff.db.from("assignment_submissions").select("id,status").eq("id", parsed.data.submissionId).eq("assignment_id", assignmentId).eq("student_id", studentId).maybeSingle();
    if (sub.error) throw sub.error;
    if (!sub.data) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    if (sub.data.status !== "submitted") return NextResponse.json({ error: "Wait until the work is submitted." }, { status: 409 });
    if (parsed.data.action === "retake") {
      const result = await staff.db.rpc("grant_assignment_retake", { p_submission: sub.data.id });
      if (result.error) throw result.error;
      return NextResponse.json({ extraAttempts: result.data });
    }
    const result = await staff.db.from("assignment_feedback").insert({ submission_id: sub.data.id, question_id: parsed.data.questionId, author_id: staff.actor.id, body: parsed.data.body }).select("*").single();
    if (result.error) throw result.error;
    return NextResponse.json({ feedback: result.data }, { status: 201 });
  } catch (error) { return homeworkError(error); }
}
