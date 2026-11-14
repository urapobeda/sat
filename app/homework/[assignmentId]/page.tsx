import { HomeworkRunner } from "@/components/homework/HomeworkRunner";

export default async function HomeworkAttemptRoute({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  return <HomeworkRunner assignmentId={assignmentId} />;
}
