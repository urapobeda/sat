import { StudentProfile } from "@/components/profile/StudentProfile";
import { notFound } from "next/navigation";
import { z } from "zod";
export default async function Page({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  if (!z.uuid().safeParse(studentId).success) notFound();
  return <StudentProfile studentId={studentId} />;
}
