import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getSupabaseUserClient } from "@/lib/server/userClient";
import { logRoleDenial } from "@/lib/server/roleDiagnostics";
import { canAccessArea, isUserRole, type UserRole } from "@/lib/roles";

export const ROLE_SESSION_COOKIE = "sat-hub-access";
export type RoleActor = { id: string; role: UserRole };

export async function getVerifiedRoleActor(token?: string): Promise<RoleActor | null> {
  if (!token) { logRoleDenial("Missing session cookie or bearer token"); return null; }
  try {
    const db = getSupabaseUserClient(token);
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous) {
      logRoleDenial("Session verification failed or anonymous user", { code: error?.code });
      return null;
    }
    const profile = await db.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (profile.error) {
      logRoleDenial("Cannot read own profiles.role through RLS; check profiles grants and role migration", { code: profile.error.code });
      return null;
    }
    const role = profile.data?.role ?? "student";
    if (!isUserRole(role)) { logRoleDenial("Unknown profile role"); return null; }
    return { id: data.user.id, role };
  } catch {
    logRoleDenial("Role verification unavailable; check Supabase network and public URL/key configuration");
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
  if (!actor || !canAccessArea(actor.role, area)) {
    logRoleDenial("Page role requirement not met", { path: `/${area}`, role: actor?.role ?? "unauthenticated" });
    redirect("/");
  }
  return actor;
}
