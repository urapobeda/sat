import { z } from "zod";
import { HomeworkRunner } from "@/components/homework/HomeworkRunner";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Homework" };

export default async function HomeworkAttemptRoute({ params, searchParams }: { params: Promise<{ assignmentId: string }>; searchParams: Promise<{ submission?: string }> }) {
  const { assignmentId } = await params;
  const sub = (await searchParams).submission;
  return <HomeworkRunner assignmentId={assignmentId} initialSubmissionId={sub && z.uuid().safeParse(sub).success ? sub : undefined} />;
}
