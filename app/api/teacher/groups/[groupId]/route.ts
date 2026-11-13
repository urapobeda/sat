import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getGroupStaff, groupError } from "@/lib/server/groupAccess";
type Context = { params: Promise<{ groupId: string }> };
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rename"), name: z.string().trim().min(1).max(100) }),
  z.object({ action: z.literal("archive"), archived: z.boolean() }),
  z.object({ action: z.literal("rotate-code") }),
  z.object({ action: z.literal("transfer"), teacherId: z.uuid() })
]);

export async function GET(request: NextRequest, context: Context) {
  const staff = await getGroupStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { groupId } = await context.params;
  if (!z.uuid().safeParse(groupId).success) return NextResponse.json({ error: "Группа не найдена." }, { status: 404 });
  try {
    const group = await staff.db.rpc("list_my_groups", { p_group_id: groupId });
    if (group.error) throw group.error;
    if (!group.data?.length) return NextResponse.json({ error: "Группа не найдена." }, { status: 404 });
    const members = await staff.db.rpc("get_group_members", { p_group_id: groupId });
    if (members.error) throw members.error;
    return NextResponse.json({ group: group.data[0], members: members.data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return groupError(error); }
}

export async function PATCH(request: NextRequest, context: Context) {
  const staff = await getGroupStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { groupId } = await context.params;
  if (!z.uuid().safeParse(groupId).success) return NextResponse.json({ error: "Группа не найдена." }, { status: 404 });
  try {
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Некорректное действие." }, { status: 400 });
    const body = parsed.data;
    if (body.action === "transfer" && staff.actor.role !== "admin") return NextResponse.json({ error: "Менять учителя может только администратор." }, { status: 403 });
    if (body.action === "rotate-code") {
      const { data, error } = await staff.db.rpc("rotate_group_code", { p_group_id: groupId });
      if (error) throw error;
      return NextResponse.json({ join_code: data });
    }
    const patch = body.action === "rename" ? { name: body.name } : body.action === "archive" ? { archived: body.archived } : { teacher_id: body.teacherId };
    const { data, error } = await staff.db.from("groups").update(patch).eq("id", groupId).select("id").maybeSingle();
    if (error) throw error;
    return data ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Группа не найдена." }, { status: 404 });
  } catch (error) { return groupError(error); }
}

export async function DELETE(request: NextRequest, context: Context) {
  const staff = await getGroupStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { groupId } = await context.params;
  try {
    const body = z.object({ studentId: z.uuid() }).safeParse(await request.json());
    if (!body.success || !z.uuid().safeParse(groupId).success) return NextResponse.json({ error: "Некорректный участник." }, { status: 400 });
    // Check access even if the requested membership does not exist.
    const group = await staff.db.rpc("list_my_groups", { p_group_id: groupId });
    if (group.error) throw group.error;
    if (!group.data?.length) return NextResponse.json({ error: "Группа не найдена." }, { status: 404 });
    const { error } = await staff.db.from("group_members").delete().eq("group_id", groupId).eq("student_id", body.data.studentId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return groupError(error); }
}
