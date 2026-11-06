import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  Home,
  NotebookPen,
  Panda,
  Video
} from "lucide-react";

// Draft redesign — student/teacher workflow (homework, schedule, lesson
// recordings, teacher comments) is not implemented in Supabase yet, so nav
// items without a real page yet (Schedule, Lesson Recordings, Materials)
// link back to the dashboard as a placeholder.

export type NavId =
  | "home"
  | "homework"
  | "question-bank"
  | "tests"
  | "mistakes"
  | "schedule"
  | "recordings"
  | "materials";

type NavItem = {
  id: NavId;
  label: string;
  href: string;
  icon: ComponentType<{ size?: number }>;
  badge?: string;
  badgeTone?: "amber" | "slate";
};

const sidebarNav: NavItem[] = [
  { id: "home", label: "Home", href: "/dashboard", icon: Home },
  {
    id: "homework",
    label: "Homework",
    href: "/homework",
    icon: ClipboardList,
    badge: "3",
    badgeTone: "amber"
  },
  { id: "question-bank", label: "Question Bank", href: "/question-bank", icon: BookOpen },
  { id: "tests", label: "Practice Tests", href: "/tests", icon: FileText },
  {
    id: "mistakes",
    label: "Mistake Notebook",
    href: "/mistakes",
    icon: NotebookPen,
    badge: "17",
    badgeTone: "slate"
  },
  { id: "schedule", label: "Schedule", href: "/schedule", icon: CalendarDays },
  { id: "recordings", label: "Lesson Recordings", href: "/recordings", icon: Video },
  { id: "materials", label: "Materials", href: "/materials", icon: FolderOpen }
];

export function StudentShell({
  active,
  children
}: {
  active: NavId;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="hidden w-72 shrink-0 bg-slate-900 p-6 lg:block">
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-950/40">
              <Panda size={24} />
            </span>
            <div>
              <p className="text-xl font-black text-white">sat/hub</p>
              <p className="text-xs font-semibold text-slate-400">
                SAT · IELTS · English
              </p>
            </div>
          </div>

          <nav className="mt-8 space-y-1.5">
            {sidebarNav.map((item) => {
              const isActive = item.id === active;

              return (
                <Link
                  className={[
                    "flex items-center justify-between rounded-xl px-3.5 py-3 text-[15px] font-bold transition",
                    isActive
                      ? "bg-blue-600 !text-white shadow-lg shadow-blue-950/30"
                      : "!text-slate-300 hover:bg-white/5 hover:!text-white"
                  ].join(" ")}
                  href={item.href}
                  key={item.id}
                >
                  <span className="flex items-center gap-3.5">
                    <item.icon size={19} />
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-xs font-black",
                        item.badgeTone === "amber"
                          ? "bg-amber-400/20 text-amber-300"
                          : "bg-white/10 text-slate-300"
                      ].join(" ")}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 p-6 sm:p-8 lg:p-10 xl:p-12">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
