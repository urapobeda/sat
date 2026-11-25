import { NextResponse, type NextRequest } from "next/server";
import { getGroupStaff } from "@/lib/server/groupAccess";
import { vocabularyError, vocabularySchema, vocabularyValues } from "@/lib/server/vocabularyAccess";

export async function POST(request: NextRequest) {
  const staff = await getGroupStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = vocabularySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Enter one word, a translation and an English definition." }, { status: 400 });
  try {
    const result = await staff.db.from("vocabulary_words").insert({ ...vocabularyValues(body.data), created_by: staff.actor.id }).select("id").single();
    if (result.error) throw result.error;
    return NextResponse.json(result.data, { status: 201 });
  } catch (error) { return vocabularyError(error); }
}
