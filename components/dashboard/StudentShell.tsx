import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  Calculator,
  ChartNoAxesCombined,
  Target,
  ClipboardList,
  FileText,
  FolderOpen,
  Home,
  NotebookPen,
  Video
} from "lucide-react";
import { StudentAccount, StudentAccountProvider } from "@/components/dashboard/StudentAccount";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BearIcon } from "@/components/dashboard/BearIcon";

// Draft redesign — student/teacher workflow (homework, schedule, lesson
// recordings, teacher comments) is not implemented in Supabase yet, so nav
// items without a real page yet (Schedule, Lesson Recordings, Materials)
// link back to the dashboard as a placeholder.

export type NavId =
  | "home"
  | "progress"
  | "study-plan"
  | "calculator"
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
  { id: "materials", label: "Materials", href: "/materials", icon: FolderOpen },
  { id: "study-plan", label: "Study Plan", href: "/study-plan", icon: Target },
  { id: "progress", label: "Progress", href: "/progress", icon: ChartNoAxesCombined },
  { id: "calculator", label: "SAT Score Calculator", href: "/tools/sat-score-calculator", icon: Calculator }
];

export function StudentShell({
  active,
  children
}: {
  active: NavId;
  children: ReactNode;
}) {
  return (
    <StudentAccountProvider>
      <div className="min-h-screen bg-slate-50">
        <header className="bg-slate-900 px-6 py-3 lg:hidden">
          <StudentAccount />
          <nav aria-label="Main navigation" className="mt-3 flex gap-4 overflow-x-auto whitespace-nowrap pb-1 text-sm">
            {sidebarNav.map((item) => (
              <Link aria-current={item.id === active ? "page" : undefined} className="!text-slate-300 aria-[current=page]:!text-white aria-[current=page]:underline" href={item.href} key={item.id}>{item.label}</Link>
            ))}
          </nav>
        </header>
        <div className="flex">
          <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto bg-slate-900 px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen">
            <div className="flex items-center gap-3 px-1">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-950/40">
                <BearIcon size={24} />
              </span>
              <div>
                <p className="text-xl font-bold text-white">sat/hub</p>
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
                      "flex items-center justify-between rounded-xl px-2.5 py-3 text-[15px] font-semibold transition",
                      isActive
                        ? "bg-blue-600 !text-white shadow-lg shadow-blue-950/30"
                        : "!text-slate-300 hover:bg-white/5 hover:!text-white"
                    ].join(" ")}
                    href={item.href}
                    key={item.id}
                  >
                    <span className="flex items-center gap-2.5">
                      <item.icon size={19} />
                      {item.label}
                    </span>
                    {item.badge ? (
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-xs font-bold",
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

            <div className="mt-auto border-t border-white/10 pt-5">
              <StudentAccount />
              <div className="mt-3"><ThemeToggle /></div>
            </div>
          </aside>

          <div className="flex-1 overflow-hidden p-6 sm:p-8 lg:p-10 xl:p-12">
            {children}
          </div>
        </div>
      </div>
    </StudentAccountProvider>
  );
}
