import { NextResponse, type NextRequest } from "next/server";
import { profileActor, studentProfile } from "@/lib/server/studentProfiles";
import { z } from "zod";
export async function GET(request: NextRequest) {
  const context = await profileActor(request);
  if (!context || context.actor.role === "student")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? 0);
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000)
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  const query = request.nextUrl.searchParams.get("q") ?? "";
  if (query.length > 200)
    return NextResponse.json({ error: "Search is too long" }, { status: 400 });
  const ids = await context.db
    .rpc("search_teacher_students", { p_query: query })
    .range(offset, offset + 24);
  if (ids.error)
    return NextResponse.json(
      { error: "Students unavailable" },
      { status: 503 },
    );
  try {
    const students = [];
    for (let i = 0; i < (ids.data?.length ?? 0); i += 4) {
      const batch = await Promise.all(
        ids.data!.slice(i, i + 4).map(async (r) => {
          const p = await studentProfile(context.db, r.student_id);
          return {
            id: p.profile.id,
            name: p.profile.full_name ?? "Student",
            groups: p.groups.map((g) => g.name).join(", "),
            score: p.tests.find((t) => t.score !== null)?.score ?? null,
            target: p.profile.target_score,
            accuracy: p.accuracy,
            homework: `${p.homework.onTime + p.homework.late}/${p.homework.onTime + p.homework.late + p.homework.missing}`,
            lastActivity: p.lastActivity,
          };
        }),
      );
      students.push(...batch);
    }
    return NextResponse.json(
      { students, hasMore: ids.data?.length === 25 },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Students could not be loaded" },
      { status: 503 },
    );
  }
}
export async function POST(request: NextRequest) {
  const context = await profileActor(request);
  if (!context || context.actor.role === "student")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const input = z
    .object({ studentId: z.uuid(), body: z.string().trim().min(1).max(5000) })
    .strict()
    .safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json({ error: "Invalid note" }, { status: 400 });
  const saved = await context.db
    .from("teacher_notes")
    .insert({
      student_id: input.data.studentId,
      author_id: context.actor.id,
      body: input.data.body,
    })
    .select("id")
    .single();
  return saved.error
    ? NextResponse.json({ error: "Note unavailable" }, { status: 403 })
    : NextResponse.json({ id: saved.data.id }, { status: 201 });
}
