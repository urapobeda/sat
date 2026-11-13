import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getGroupStaff, groupError } from "@/lib/server/groupAccess";

export async function GET(request: NextRequest) {
  const staff = await getGroupStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { data, error } = await staff.db.rpc("list_my_groups");
    if (error) throw error;
    return NextResponse.json({ groups: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return groupError(error); }
}
export async function POST(request: NextRequest) {
  const staff = await getGroupStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = z.object({ name: z.string().trim().min(1).max(100) }).safeParse(await request.json());
    if (!body.success) return NextResponse.json({ error: "Введите название до 100 символов." }, { status: 400 });
    const { data, error } = await staff.db.rpc("create_group", { p_name: body.data.name });
    if (error) throw error;
    return NextResponse.json({ id: data }, { status: 201 });
  } catch (error) { return groupError(error); }
}
