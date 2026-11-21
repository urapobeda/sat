import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getGroupStaff } from "@/lib/server/groupAccess";
import { lessonError } from "@/lib/server/lessonAccess";

const schema = z.object({ part: z.enum(["classwork", "homework"]), dueAt: z.iso.datetime({ offset: true }).nullable(), comment: z.string().max(5000), requestId: z.uuid() });
export async function POST(request: NextRequest, context: { params: Promise<{ lessonId: string }> }) {
  const staff = await getGroupStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { lessonId } = await context.params;
  if (!z.uuid().safeParse(lessonId).success) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Check the due date and assignment settings." }, { status: 400 });
  try {
    const result = await staff.db.rpc("assign_lesson_part", { p_lesson: lessonId, p_part: body.data.part, p_due_at: body.data.dueAt, p_comment: body.data.comment, p_request_id: body.data.requestId });
    if (result.error) throw result.error;
    if (!result.data?.[0]) throw new Error("Missing assignment");
    return NextResponse.json({ id: result.data[0].id, studentCount: result.data[0].student_count }, { status: 201 });
  } catch (error) { return lessonError(error); }
}
