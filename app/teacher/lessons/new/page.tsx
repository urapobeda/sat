import { redirect } from "next/navigation";
import { z } from "zod";
import { LessonEditor } from "@/components/lessons/LessonEditor";
export const metadata = { title: "Create lesson" };
export default async function CreateLessonRoute({ searchParams }: { searchParams: Promise<{ groupId?: string }> }) {
  const { groupId } = await searchParams;
  if (!groupId || !z.uuid().safeParse(groupId).success) redirect("/teacher/groups");
  return <LessonEditor initialGroupId={groupId} />;
}
