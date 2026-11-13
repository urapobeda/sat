import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { canAccessArea, isUserRole, type UserRole } from "@/lib/roles";

export const ROLE_SESSION_COOKIE = "sat-hub-access";
export type RoleActor = { id: string; role: UserRole };

export async function getVerifiedRoleActor(token?: string): Promise<RoleActor | null> {
  if (!token) return null;
  try {
    const db = getSupabaseAdminClient();
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous) return null;
    const profile = await db.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (profile.error) return null; // Fail closed if the role migration/database is unavailable.
    const role = profile.data?.role ?? "student";
    return isUserRole(role) ? { id: data.user.id, role } : null;
  } catch {
    return null;
  }
}

export function getApiRoleActor(request: NextRequest) {
  const header = request.headers.get("authorization");
  // Mutating APIs require a bearer token, never ambient cookies.
  return getVerifiedRoleActor(header?.startsWith("Bearer ") ? header.slice(7) : undefined);
}

export async function requirePageRole(area: "teacher" | "admin") {
  const actor = await getVerifiedRoleActor((await cookies()).get(ROLE_SESSION_COOKIE)?.value);
  if (!actor || !canAccessArea(actor.role, area)) redirect("/");
  return actor;
}
