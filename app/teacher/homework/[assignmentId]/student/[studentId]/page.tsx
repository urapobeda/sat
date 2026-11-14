import { requirePageRole } from "@/lib/server/roles";
import { StudentWorkPage } from "@/components/homework/StudentWorkPage";
export default async function WorkPage({ params }: { params: Promise<{ assignmentId: string; studentId: string }> }) {
  await requirePageRole("teacher");
  const ids = await params;
  return <StudentWorkPage {...ids} />;
}
