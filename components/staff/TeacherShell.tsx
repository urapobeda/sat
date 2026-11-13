"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BearIcon } from "@/components/dashboard/BearIcon";
import { StudentAccount, StudentAccountProvider } from "@/components/dashboard/StudentAccount";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RoleSwitch } from "@/components/staff/RoleSwitch";
import type { UserRole } from "@/lib/roles";

export const teacherLinks = [
  ["/teacher", "Обзор"], ["/teacher/groups", "Группы"],
  ["/teacher/homework", "Домашки"], ["/teacher/students", "Ученики"],
  ["/teacher/schedule", "Расписание"], ["/teacher/materials", "Материалы"]
] as const;

export function TeacherShell({ children, role }: { children: ReactNode; role: UserRole }) {
  const pathname = usePathname();
  return (
    <StudentAccountProvider>
      <div className="hub-shell min-h-dvh lg:flex">
        <aside className="hub-sidebar flex flex-col gap-5 p-4 lg:sticky lg:top-0 lg:h-dvh lg:w-[var(--hub-sidebar-width)] lg:shrink-0 lg:overflow-y-auto">
          <Link href="/teacher" className="flex items-center gap-3 font-bold"><span className="grid size-9 place-items-center rounded-xl bg-blue-500 text-white"><BearIcon size={24} /></span>SAT Hub</Link>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Кабинет учителя</p>
          <nav aria-label="Кабинет учителя" className="flex flex-wrap gap-1 lg:flex-col">
            {teacherLinks.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className="hub-nav-link px-3">{label}</Link>)}
            {role === "admin" ? <Link href="/admin/users" aria-current={pathname.startsWith("/admin") ? "page" : undefined} className="hub-nav-link px-3">Пользователи</Link> : null}
          </nav>
          <div className="space-y-3 border-t border-white/10 pt-4 lg:mt-auto">
            <RoleSwitch role={role} staff />
            <ThemeToggle />
            <StudentAccount hideRoleSwitch />
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:p-8"><div className="mx-auto max-w-7xl">{children}</div></main>
      </div>
    </StudentAccountProvider>
  );
}
