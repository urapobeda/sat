import { NextResponse, type NextRequest } from "next/server";
import { getApiRoleActor, getVerifiedRoleActor, ROLE_SESSION_COOKIE } from "@/lib/server/roles";
import { getRoleAccessDecision } from "@/lib/roles";
import { logRoleDenial } from "@/lib/server/roleDiagnostics";

export async function proxy(request: NextRequest) {
  const actor = request.nextUrl.pathname.startsWith("/api/")
    ? await getApiRoleActor(request)
    : await getVerifiedRoleActor(request.cookies.get(ROLE_SESSION_COOKIE)?.value);
  const decision = getRoleAccessDecision(actor?.role ?? null, request.nextUrl.pathname);
  if (decision.type !== "allow") logRoleDenial("Proxy role requirement not met", { path: request.nextUrl.pathname, role: actor?.role ?? "unauthenticated" });
  if (decision.type === "redirect") return NextResponse.redirect(new URL(decision.location, request.url));
  if (decision.type === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.next();
}
export const config = { matcher: ["/teacher/:path*", "/admin/:path*", "/api/teacher/:path*", "/api/admin/:path*"] };
