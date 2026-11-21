import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getGroupStaff } from "@/lib/server/groupAccess";
import { lessonError, lessonSaveArgs, lessonSaveSchema } from "@/lib/server/lessonAccess";

export async function PATCH(request: NextRequest, context: { params: Promise<{ lessonId: string }> }) {
  const staff = await getGroupStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { lessonId } = await context.params;
  if (!z.uuid().safeParse(lessonId).success) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  const body = lessonSaveSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Check the lesson fields and remove duplicate questions." }, { status: 400 });
  try {
    const result = await staff.db.rpc("save_lesson", lessonSaveArgs(body.data, lessonId));
    if (result.error) throw result.error;
    return NextResponse.json({ id: result.data });
  } catch (error) { return lessonError(error); }
}
