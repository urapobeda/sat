import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getApiRoleActor } from "@/lib/server/roles";
import { getSupabaseUserClient } from "@/lib/server/userClient";

export async function getHomeworkStaff(request: NextRequest) {
  const actor = await getApiRoleActor(request);
  if (!actor || actor.role === "student") return null;
  return { actor, db: getSupabaseUserClient(request.headers.get("authorization")!.slice(7)) };
}

export function homeworkError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
  const status =
    code === "42501" ? 403 :
    code === "P0002" ? 404 :
    ["22023", "23514", "23503"].includes(String(code)) || error instanceof SyntaxError ? 400 : 503;
  return NextResponse.json(
    {
      error:
        status === 403 ? "You do not have access to this assignment." :
        status === 400 ? "Check the assignment settings and selected questions." :
        "Could not load or update the assignment. Please try again."
    },
    { status }
  );
}
