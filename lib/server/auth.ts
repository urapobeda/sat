import type { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getAuthenticatedUserId(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}
