import type { ReactNode } from "react";
import { TeacherShell } from "@/components/staff/TeacherShell";
import { requirePageRole } from "@/lib/server/roles";
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const actor = await requirePageRole("admin");
  return <TeacherShell role={actor.role}>{children}</TeacherShell>;
}
