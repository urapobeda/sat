import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiRoleActor } from "@/lib/server/roles";
import { getSupabaseUserClient } from "@/lib/server/userClient";
import { lessonError } from "@/lib/server/lessonAccess";

export async function GET(request: NextRequest, context: { params: Promise<{ lessonId: string }> }) {
  const actor = await getApiRoleActor(request);
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { lessonId } = await context.params;
  if (!z.uuid().safeParse(lessonId).success) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  const db = getSupabaseUserClient(request.headers.get("authorization")!.slice(7));
  try {
    const lesson = await db.from("lessons").select("*").eq("id", lessonId).maybeSingle();
    if (lesson.error) throw lesson.error;
    if (!lesson.data) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    const [items, group] = await Promise.all([
      db.from("lesson_items").select("*").eq("lesson_id", lessonId).order("position"),
      db.rpc("list_my_groups", { p_group_id: lesson.data.group_id })
    ]);
    if (items.error || group.error) throw items.error ?? group.error;
    return NextResponse.json({ lesson: lesson.data, items: items.data ?? [], group: group.data?.[0] ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return lessonError(error); }
}
