import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { profileActor, studentProfile } from "@/lib/server/studentProfiles";

const fields = z
  .object({
    full_name: z.string().trim().min(1).max(120),
    target_score: z.number().int().min(400).max(1600).nullable(),
    sat_date: z.iso.date().nullable(),
    school: z.string().trim().max(200),
    grade: z.string().trim().max(40),
    telegram: z.string().trim().max(100),
    about: z.string().trim().max(2000),
    avatar_url: z.string().max(500).nullable(),
  })
  .strict();
export async function GET(request: NextRequest) {
  const context = await profileActor(request);
  if (!context)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("studentId") ?? context.actor.id;
  if (
    !z.uuid().safeParse(id).success ||
    (id !== context.actor.id && context.actor.role === "student")
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    return NextResponse.json(
      await studentProfile(context.db, id, context.actor.role !== "student"),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Profile unavailable. Check access and try again." },
      { status: 403 },
    );
  }
}
export async function PATCH(request: NextRequest) {
  const context = await profileActor(request);
  if (!context)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = fields.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the profile fields" },
      { status: 400 },
    );
  const value = parsed.data;
  if (
    value.avatar_url &&
    (!value.avatar_url.startsWith(context.actor.id + "/") ||
      value.avatar_url.includes(".."))
  )
    return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
  if (value.avatar_url) {
    const object = await context.db.storage
      .from("avatars")
      .info(value.avatar_url);
    if (object.error)
      return NextResponse.json(
        { error: "Upload your avatar first" },
        { status: 400 },
      );
  }
  const saved = await context.db
    .from("profiles")
    .update(value)
    .eq("id", context.actor.id)
    .select("id")
    .single();
  return saved.error
    ? NextResponse.json(
        { error: "Profile could not be saved" },
        { status: 503 },
      )
    : NextResponse.json({ ok: true });
}
