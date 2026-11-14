import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getHomeworkStaff, homeworkError } from "@/lib/server/homeworkAccess";
import { loadAssignmentReport } from "@/lib/server/assignmentReports";
export async function GET(request: NextRequest, context: { params: Promise<{ assignmentId: string }> }) {
  const staff = await getHomeworkStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { assignmentId } = await context.params;
  if (!z.uuid().safeParse(assignmentId).success) return NextResponse.json({ error: "Задание не найдено." }, { status: 404 });
  try { return NextResponse.json(await loadAssignmentReport(staff, assignmentId), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return homeworkError(error); }
}
