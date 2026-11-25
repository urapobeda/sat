import { NextResponse, type NextRequest } from "next/server";
import { getApiRoleActor } from "@/lib/server/roles";
import { getSupabaseUserClient } from "@/lib/server/userClient";
import { allLessonRows } from "@/lib/server/lessonAccess";
import { vocabularyError } from "@/lib/server/vocabularyAccess";

export async function GET(request: NextRequest) {
  const actor = await getApiRoleActor(request);
  if (!actor) return NextResponse.json({ error: "Sign in to use the course vocabulary." }, { status: 401 });
  try {
    const db = getSupabaseUserClient(request.headers.get("authorization")!.slice(7));
    const context = request.nextUrl.searchParams.get("context") === "1";
    if (context && actor.role === "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const [words, groups, lessons] = await Promise.all([
      allLessonRows((from, to) => db.rpc("list_vocabulary_words").range(from, to)),
      context ? allLessonRows((from, to) => db.rpc("list_my_groups").range(from, to)) : [],
      context ? allLessonRows((from, to) => db.rpc("list_my_lessons").range(from, to)) : []
    ]);
    return NextResponse.json({ words, ...(context ? { groups, lessons, userId: actor.id } : {}) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return vocabularyError(error); }
}
