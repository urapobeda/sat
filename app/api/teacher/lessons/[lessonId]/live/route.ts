import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getGroupStaff } from "@/lib/server/groupAccess";
import { liveError } from "@/lib/server/liveAccess";
import { allLessonRows } from "@/lib/server/lessonAccess";
type Context = { params: Promise<{ lessonId: string }> };
export async function GET(request: NextRequest, context: Context) {
  const staff = await getGroupStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { lessonId } = await context.params;
  if (!z.uuid().safeParse(lessonId).success) return NextResponse.json({ error: "Invalid lesson." }, { status: 400 });
  try {
    const sessions = await allLessonRows((from, to) => staff.db.rpc("list_my_live_sessions", { p_lesson: lessonId, p_active: false }).range(from, to));
    return NextResponse.json({ sessions }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return liveError(error); }
}
export async function POST(request: NextRequest, context: Context) {
  const staff = await getGroupStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { lessonId } = await context.params;
  if (!z.uuid().safeParse(lessonId).success) return NextResponse.json({ error: "Invalid lesson." }, { status: 400 });
  try {
    const result = await staff.db.rpc("start_live_lesson", { p_lesson: lessonId });
    if (result.error) throw result.error;
    return NextResponse.json({ code: result.data }, { status: 201 });
  } catch (error) { return liveError(error); }
}
