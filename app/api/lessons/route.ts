import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiRoleActor } from "@/lib/server/roles";
import { getSupabaseUserClient } from "@/lib/server/userClient";
import { allLessonRows, lessonError } from "@/lib/server/lessonAccess";

export async function GET(request: NextRequest) {
  const actor = await getApiRoleActor(request);
  if (!actor) return NextResponse.json({ error: "Sign in to view lessons." }, { status: 403 });
  const groupId = request.nextUrl.searchParams.get("groupId");
  if (groupId && !z.uuid().safeParse(groupId).success) return NextResponse.json({ error: "Invalid group." }, { status: 400 });
  const scheduled = request.nextUrl.searchParams.get("scheduled") === "1";
  const db = getSupabaseUserClient(request.headers.get("authorization")!.slice(7));
  try {
    if (actor.role === "student") {
      const refresh = await db.rpc("refresh_my_assignment_deadlines");
      if (refresh.error) throw refresh.error;
    }
    const [lessons, assignments] = await Promise.all([
      allLessonRows((from, to) => db.rpc("list_my_lessons", { p_group_id: groupId ?? undefined, p_scheduled: scheduled }).range(from, to)),
      actor.role === "student" ? allLessonRows((from, to) => db.rpc("list_my_lesson_assignments").range(from, to)) : Promise.resolve([])
    ]);
    return NextResponse.json({ lessons, assignments }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return lessonError(error); }
}
