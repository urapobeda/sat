import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ROLE_SESSION_COOKIE } from "@/lib/server/roles";

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const { data, error } = await getSupabaseAdminClient().auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    // The token is verified above; its expiry is used only for cookie lifetime.
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    const maxAge = Math.min(3600, Math.max(0, Math.floor(Number(claims.exp) - Date.now() / 1000)));
    if (!Number.isFinite(maxAge) || maxAge === 0) return NextResponse.json({ error: "Session expired" }, { status: 401 });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(ROLE_SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge });
    return response;
  } catch {
    return NextResponse.json({ error: "Session synchronization unavailable" }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ROLE_SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
