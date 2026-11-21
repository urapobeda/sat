import { notFound } from "next/navigation";
import { z } from "zod";
import { LessonEditor } from "@/components/lessons/LessonEditor";
export const metadata = { title: "Lesson" };
export default async function LessonRoute({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  if (!z.uuid().safeParse(lessonId).success) notFound();
  return <LessonEditor lessonId={lessonId} />;
}
