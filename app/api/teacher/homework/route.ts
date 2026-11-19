import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getHomeworkStaff, homeworkError } from "@/lib/server/homeworkAccess";

const createSchema = z
  .object({
    dueAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date"),
    groupId: z.uuid(),
    instructions: z.string().max(5000).optional().default(""),
    kind: z.enum(["question_set", "past_paper"]),
    maxAttempts: z.number().int().min(1).max(10).optional().default(1),
    paperId: z.uuid().nullable().optional(),
    showAnswers: z.enum(["after_submit", "after_due", "never"]).optional().default("after_submit"),
    timeLimitMinutes: z.number().int().min(1).max(600).nullable().optional(),
    title: z.string().trim().min(1).max(200)
  })
  .refine((value) => (value.kind === "past_paper") === Boolean(value.paperId), {
    message: "paperId is required for past_paper assignments"
  });

export async function GET(request: NextRequest) {
  const staff = await getHomeworkStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const groupId = request.nextUrl.searchParams.get("groupId");
  if (groupId && !z.uuid().safeParse(groupId).success) {
    return NextResponse.json({ error: "Invalid group." }, { status: 400 });
  }

  try {
    const { data, error } = await staff.db.rpc("list_teacher_assignments", { p_group_id: groupId ?? undefined });
    if (error) throw error;
    return NextResponse.json({ assignments: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return homeworkError(error);
  }
}

export async function POST(request: NextRequest) {
  const staff = await getHomeworkStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the assignment fields." }, { status: 400 });
  }

  try {
    const body = parsed.data;
    const { data, error } = await staff.db
      .from("assignments")
      .insert({
        created_by: staff.actor.id,
        due_at: body.dueAt,
        group_id: body.groupId,
        instructions: body.instructions,
        kind: body.kind,
        max_attempts: body.maxAttempts,
        paper_id: body.paperId ?? null,
        show_answers: body.showAnswers,
        time_limit_minutes: body.timeLimitMinutes ?? null,
        title: body.title
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    return homeworkError(error);
  }
}
