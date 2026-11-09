import type { ReactNode } from "react";
import { StudentShell, type NavId } from "@/components/dashboard/StudentShell";

export function Layout({ active, children }: { active: NavId; children: ReactNode }) {
  return (
    <StudentShell active={active}>
      <main className="mx-auto w-full max-w-7xl">{children}</main>
    </StudentShell>
  );
}
