import { NextResponse, type NextRequest } from "next/server";
import { getGroupStaff, groupError } from "@/lib/server/groupAccess";
export async function GET(request: NextRequest) {
  const staff = await getGroupStaff(request);
  if (staff?.actor.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { data, error } = await staff.db.rpc("list_group_teachers");
    if (error) throw error;
    return NextResponse.json({ teachers: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return groupError(error); }
}
