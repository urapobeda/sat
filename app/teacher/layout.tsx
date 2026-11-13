import type { ReactNode } from "react";
import { TeacherShell } from "@/components/staff/TeacherShell";
import { requirePageRole } from "@/lib/server/roles";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const actor = await requirePageRole("teacher");
  return <TeacherShell role={actor.role}>{children}</TeacherShell>;
}
