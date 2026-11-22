import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getGroupStaff } from "@/lib/server/groupAccess";
import { vocabularyError, vocabularyScope } from "@/lib/server/vocabularyAccess";
import { parseVocabularyImport } from "@/lib/vocabulary";

export async function POST(request: NextRequest) {
  const staff = await getGroupStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = z.object({ ...vocabularyScope, text: z.string().max(250000) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Check the import text and destination." }, { status: 400 });
  let rows;
  try { rows = parseVocabularyImport(body.data.text); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Check the import text." }, { status: 400 }); }
  try {
    const result = await staff.db.rpc("add_vocabulary_batch", { p_group_id: body.data.groupId, p_lesson_id: body.data.lessonId, p_rows: rows });
    if (result.error) throw result.error;
    return NextResponse.json(result.data?.[0]);
  } catch (error) { return vocabularyError(error); }
}
