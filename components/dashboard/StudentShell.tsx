"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { BookOpen, CalendarDays, Calculator, ChartNoAxesCombined, ClipboardList, FileText, FolderOpen, Home, Menu, NotebookPen, PanelLeftClose, PanelLeftOpen, Target, Video, X } from "lucide-react";
import { StudentAccount, StudentAccountProvider } from "@/components/dashboard/StudentAccount";
import { BearIcon } from "@/components/dashboard/BearIcon";

const groups = [
  { title: "Workspace", items: [
    { id: "home", label: "Home", href: "/dashboard", icon: Home },
    { id: "question-bank", label: "Question Bank", href: "/question-bank", icon: BookOpen },
    { id: "tests", label: "Practice Tests", href: "/tests", icon: FileText },
    { id: "mistakes", label: "Mistake Notebook", href: "/mistakes", icon: NotebookPen },
    { id: "progress", label: "Progress", href: "/progress", icon: ChartNoAxesCombined }
  ] },
  { title: "Learning", items: [
    { id: "study-plan", label: "Study Plan", href: "/study-plan", icon: Target },
    { id: "homework", label: "Homework", href: "/homework", icon: ClipboardList },
    { id: "schedule", label: "Schedule", href: "/schedule", icon: CalendarDays },
    { id: "recordings", label: "Lesson Recordings", href: "/recordings", icon: Video },
    { id: "materials", label: "Materials", href: "/materials", icon: FolderOpen },
    { id: "calculator", label: "SAT Score Calculator", href: "/tools/sat-score-calculator", icon: Calculator }
  ] }
] as const;

export type NavId = (typeof groups)[number]["items"][number]["id"];

export function confirmLeavingStudy() {
  return window.confirm("Leave this study session?");
}

export function StudentShell({ active, children, exam = false, guardExit = false }: {
  active: NavId;
  children: ReactNode;
  exam?: boolean;
  guardExit?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(exam);
  const drawer = useRef<HTMLDialogElement>(null);
  const drawerId = useId();

  useEffect(() => {
    if (!guardExit) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [guardExit]);

  function renderNav(compact: boolean) {
    return (
      <nav aria-label="Main navigation" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1.5 py-2">
        {groups.map((group) => (
          <div key={group.title}>
            <p className={compact ? "sr-only" : "mb-1 px-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400"}>{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  aria-current={item.id === active ? "page" : undefined}
                  aria-label={compact ? item.label : undefined}
                  className={`hub-nav-link ${compact ? "justify-center px-0" : "gap-3 px-2.5"}`}
                  href={item.href}
                  key={item.id}
                  onNavigate={(event) => {
                    if (guardExit && !confirmLeavingStudy()) event.preventDefault();
                    else drawer.current?.close();
                  }}
                  title={compact ? item.label : undefined}
                >
                  <item.icon aria-hidden="true" className="shrink-0" size={18} strokeWidth={1.8} />
                  {compact ? null : item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  function renderBrand(compact: boolean) {
    return (
      <div className={`flex min-w-0 items-center gap-2.5 ${compact ? "justify-center" : ""}`}>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-500 text-white">
          <BearIcon size={24} />
        </span>
        {compact ? null : <span className="whitespace-nowrap text-base font-bold tracking-tight">SAT Hub</span>}
      </div>
    );
  }

  return (
    <StudentAccountProvider>
      <div className={`hub-shell flex min-h-dvh flex-col lg:flex-row ${exam ? "h-dvh" : ""}`}>
        <div className="hub-mobile-bar flex shrink-0 items-center gap-3 lg:hidden">
          <button aria-controls={drawerId} aria-haspopup="dialog" aria-label="Open navigation" className="hub-nav-button" onClick={() => drawer.current?.showModal()} type="button"><Menu size={20} /></button>
          {renderBrand(false)}
        </div>
        <dialog aria-label="SAT Hub navigation" className="hub-drawer" id={drawerId} ref={drawer} onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}>
          <div className="hub-sidebar flex h-full flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              {renderBrand(false)}
              <button aria-label="Close navigation" className="hub-nav-button" onClick={() => drawer.current?.close()} type="button"><X size={18} /></button>
            </div>
            {renderNav(false)}
            <div className="space-y-3 border-t border-white/10 pt-3">
              {guardExit ? <p className="text-xs text-slate-300">Account controls return after the session.</p> : <StudentAccount />}
            </div>
          </div>
        </dialog>
        <aside className={`hub-sidebar sticky top-0 hidden h-dvh shrink-0 flex-col gap-3 overflow-hidden p-3 motion-safe:transition-[width] lg:flex ${collapsed ? "w-[4.5rem]" : "w-[var(--hub-sidebar-width)]"}`}>
          <div className={`flex items-center gap-2 ${collapsed ? "flex-col" : "justify-between px-1"}`}>
            {renderBrand(collapsed)}
            <button aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={!collapsed} className="hub-nav-button" onClick={() => setCollapsed(!collapsed)} type="button">
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
          </div>
          {renderNav(collapsed)}
          <div className={`flex flex-col gap-3 border-t border-white/10 pt-3 ${collapsed ? "items-center" : "px-1"}`}>
            {guardExit ? null : <StudentAccount compact={collapsed} />}
          </div>
        </aside>
        <div className={exam ? "min-h-0 min-w-0 flex-1 overflow-y-auto" : "min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:px-10"}>
          {children}
        </div>
      </div>
    </StudentAccountProvider>
  );
}
