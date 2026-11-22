import { NextResponse, type NextRequest } from "next/server";
import { liveActor, liveError } from "@/lib/server/liveAccess";
import { allLessonRows } from "@/lib/server/lessonAccess";
export async function GET(request: NextRequest) {
  const actor = await liveActor(request);
  if (!actor) return NextResponse.json({ error: "Sign in to join live practice." }, { status: 401 });
  try {
    const sessions = await allLessonRows((from, to) => actor.db.rpc("list_my_live_sessions").range(from, to));
    return NextResponse.json({ sessions }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return liveError(error); }
}
