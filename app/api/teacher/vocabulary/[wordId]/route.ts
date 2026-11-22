import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getGroupStaff } from "@/lib/server/groupAccess";
import { vocabularyError, vocabularySchema, vocabularyValues } from "@/lib/server/vocabularyAccess";
type Context = { params: Promise<{ wordId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const staff = await getGroupStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { wordId } = await context.params;
  const body = vocabularySchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(wordId).success || !body.success) return NextResponse.json({ error: "Check the word fields." }, { status: 400 });
  try {
    const result = await staff.db.from("vocabulary_words").update(vocabularyValues(body.data)).eq("id", wordId).select("id").maybeSingle();
    if (result.error) throw result.error;
    return NextResponse.json(result.data ?? { error: "Word not found." }, { status: result.data ? 200 : 404 });
  } catch (error) { return vocabularyError(error); }
}
export async function DELETE(request: NextRequest, context: Context) {
  const staff = await getGroupStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { wordId } = await context.params;
  if (!z.uuid().safeParse(wordId).success) return NextResponse.json({ error: "Invalid word." }, { status: 400 });
  try {
    const result = await staff.db.from("vocabulary_words").delete().eq("id", wordId).select("id").maybeSingle();
    if (result.error) throw result.error;
    return NextResponse.json(result.data ?? { error: "Word not found." }, { status: result.data ? 200 : 404 });
  } catch (error) { return vocabularyError(error); }
}
