import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getHomeworkStaff, homeworkError } from "@/lib/server/homeworkAccess";

type Context = { params: Promise<{ assignmentId: string }> };

const updateSchema = z.object({
  action: z.literal("update"),
  dueAt: z.string().refine((value) => !Number.isNaN(Date.parse(value))).nullable().optional(),
  instructions: z.string().max(5000).optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  showAnswers: z.enum(["after_submit", "after_due", "never"]).optional(),
  timeLimitMinutes: z.number().int().min(1).max(600).nullable().optional(),
  title: z.string().trim().min(1).max(200).optional()
});
const publishSchema = z.object({ action: z.literal("publish"), published: z.boolean() });
const questionsSchema = z.object({ action: z.literal("set_questions"), questionIds: z.array(z.uuid()).min(1).max(100) });
const actionSchema = z.discriminatedUnion("action", [updateSchema, publishSchema, questionsSchema,z.object({action:z.literal("duplicate")})]);

export async function GET(request: NextRequest, context: Context) {
  const staff = await getHomeworkStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { assignmentId } = await context.params;
  if (!z.uuid().safeParse(assignmentId).success) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

  try {
    const assignment = await staff.db.from("assignments").select("*").eq("id", assignmentId).maybeSingle();
    if (assignment.error) throw assignment.error;
    if (!assignment.data) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

    const [questions, roster, submissions] = await Promise.all([
      staff.db.from("assignment_questions").select("question_id,position").eq("assignment_id", assignmentId).order("position"),
      staff.db.rpc("get_assignment_roster", { p_assignment_id: assignmentId }),
      staff.db.from("assignment_submissions").select("id", {count:"exact",head:true}).eq("assignment_id",assignmentId)
    ]);
    if (questions.error) throw questions.error;
    if (roster.error) throw roster.error;
    if (submissions.error) throw submissions.error;

    return NextResponse.json(
      { assignment: assignment.data, questions: questions.data ?? [], roster: roster.data ?? [], hasSubmissions:(submissions.count??0)>0 },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return homeworkError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const staff = await getHomeworkStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { assignmentId } = await context.params;
  if (!z.uuid().safeParse(assignmentId).success) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action." }, { status: 400 });

  try {
    const body = parsed.data;
    if (body.action === "duplicate") {
      const result = await staff.db.rpc("duplicate_assignment",{p_assignment:assignmentId});
      if (result.error) throw result.error;
      return NextResponse.json({id:result.data},{status:201});
    }

    if (body.action === "set_questions") {
      const { error } = await staff.db.rpc("set_assignment_questions", {
        p_assignment_id: assignmentId,
        p_question_ids: body.questionIds
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    const patch =
      body.action === "publish"
        ? { published: body.published }
        : Object.fromEntries(
            Object.entries({
              due_at: body.dueAt,
              instructions: body.instructions,
              max_attempts: body.maxAttempts,
              show_answers: body.showAnswers,
              time_limit_minutes: body.timeLimitMinutes,
              title: body.title
            }).filter(([, value]) => value !== undefined)
          );

    const { data, error } = await staff.db.from("assignments").update(patch).eq("id", assignmentId).select("id").maybeSingle();
    if (error) throw error;
    return data ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  } catch (error) {
    return homeworkError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const staff = await getHomeworkStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { assignmentId } = await context.params;
  if (!z.uuid().safeParse(assignmentId).success) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

  try {
    const submissions = await staff.db.from("assignment_submissions").select("id",{count:"exact",head:true}).eq("assignment_id",assignmentId);
    if (submissions.error) throw submissions.error;
    if ((submissions.count??0)>0) {
      return NextResponse.json({ error: "Cannot delete: students have already submitted." }, { status: 409 });
    }

    const { data, error } = await staff.db.from("assignments").delete().eq("id", assignmentId).select("id").maybeSingle();
    if (error) throw error;
    return data ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  } catch (error) {
    return homeworkError(error);
  }
}
