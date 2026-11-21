import { NextResponse, type NextRequest } from "next/server";
import { getGroupStaff } from "@/lib/server/groupAccess";
import { lessonError, lessonSaveArgs, lessonSaveSchema } from "@/lib/server/lessonAccess";

export async function POST(request: NextRequest) {
  const staff = await getGroupStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = lessonSaveSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Check the lesson fields and remove duplicate questions." }, { status: 400 });
  try {
    const result = await staff.db.rpc("save_lesson", lessonSaveArgs(body.data, null));
    if (result.error) throw result.error;
    return NextResponse.json({ id: result.data }, { status: 201 });
  } catch (error) { return lessonError(error); }
}
