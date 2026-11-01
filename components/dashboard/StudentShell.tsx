import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  FolderOpen,
  Home,
  NotebookPen,
  Play,
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
  children,
  title
}: {
  active: NavId;
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex items-center justify-between bg-blue-600 px-5 py-3 text-white sm:px-7">
        <span className="text-sm font-semibold text-blue-100">{title}</span>
        <div className="flex items-center gap-3">
          <button
            aria-label="Download report"
            className="rounded-lg p-2 text-blue-100 transition hover:bg-white/10 hover:text-white"
            type="button"
          >
            <Download size={18} />
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-1.5 text-sm font-bold transition hover:bg-white/10"
            type="button"
          >
            <Play size={14} />
            PLAY
          </button>
        </div>
      </div>

      <div className="flex">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 lg:block">
          <div className="px-1">
            <p className="text-lg font-black text-slate-950">sat/hub</p>
            <p className="text-xs font-semibold text-slate-400">
              SAT · IELTS · English
            </p>
          </div>

          <nav className="mt-6 space-y-1">
            {sidebarNav.map((item) => {
              const isActive = item.id === active;

              return (
                <Link
                  className={[
                    "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition",
                    isActive
                      ? "bg-blue-600 !text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  ].join(" ")}
                  href={item.href}
                  key={item.id}
                >
                  <span className="flex items-center gap-3">
                    <item.icon size={18} />
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-xs font-black",
                        item.badgeTone === "amber"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
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

        <div className="flex-1 p-5 sm:p-7 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
