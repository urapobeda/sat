import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getGroupStaff } from "@/lib/server/groupAccess";
import { liveError, validLiveCode } from "@/lib/server/liveAccess";
export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const staff = await getGroupStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { code } = await context.params;
  const body = z.object({ action: z.enum(["next", "reveal", "finish"]), position: z.number().int().min(1).max(100) }).safeParse(await request.json().catch(() => null));
  if (!validLiveCode(code) || !body.success) return NextResponse.json({ error: "Invalid live practice action." }, { status: 400 });
  try {
    const result = await staff.db.rpc("control_live_lesson", { p_code: code, p_action: body.data.action, p_position: body.data.position });
    if (result.error) throw result.error;
    return NextResponse.json({ saved: true });
  } catch (error) { return liveError(error); }
}
