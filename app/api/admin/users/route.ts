import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiRoleActor } from "@/lib/server/roles";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const actor = await getApiRoleActor(request);
  if (actor?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ search: z.string().trim().max(200), page: z.coerce.number().int().min(1).max(20001) })
    .safeParse({ search: request.nextUrl.searchParams.get("search") ?? "", page: request.nextUrl.searchParams.get("page") ?? "1" });
  if (!parsed.success) return NextResponse.json({ error: "Некорректный поиск." }, { status: 400 });
  try {
    const { data, error } = await getSupabaseAdminClient().rpc("admin_list_users", { p_search: parsed.data.search, p_offset: (parsed.data.page - 1) * 50 });
    if (error) throw error;
    return NextResponse.json({ users: data ?? [], total: Number(data?.[0]?.total_count ?? 0) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить пользователей. Проверьте миграцию ролей." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const actor = await getApiRoleActor(request);
  if (actor?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const parsed = z.object({ userId: z.uuid(), role: z.enum(["student", "teacher", "admin"]) }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Некорректная роль или пользователь." }, { status: 400 });
    if (parsed.data.userId === actor.id && parsed.data.role !== "admin") {
      return NextResponse.json({ error: "Нельзя снять роль администратора с самого себя." }, { status: 403 });
    }
    const { error } = await getSupabaseAdminClient().rpc("admin_set_user_role", { p_actor_id: actor.id, p_user_id: parsed.data.userId, p_role: parsed.data.role });
    if (error) return NextResponse.json({ error: "Не удалось изменить роль." }, { status: error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 503 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Не удалось изменить роль." }, { status: error instanceof SyntaxError ? 400 : 503 });
  }
}
