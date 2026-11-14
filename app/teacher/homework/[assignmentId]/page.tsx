import { TeacherHomeworkEditPage } from "@/components/homework/TeacherHomeworkEditPage";
import { requirePageRole } from "@/lib/server/roles";

export default async function TeacherHomeworkDetailRoute({ params }: { params: Promise<{ assignmentId: string }> }) {
  await requirePageRole("teacher");
  return <TeacherHomeworkEditPage assignmentId={(await params).assignmentId} />;
}
