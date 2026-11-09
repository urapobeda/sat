import { ArrowRight, BookOpen, CalendarDays, ChartNoAxesCombined, ClipboardList, FileText, FolderOpen, NotebookPen } from "lucide-react";
import Link from "next/link";
import { BearIcon } from "@/components/dashboard/BearIcon";
import { StudentGreeting } from "@/components/dashboard/StudentAccount";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { LearningSnapshot } from "@/components/dashboard/LearningSnapshot";

const shortcuts = [
  { label: "Question Bank", description: "Practice a skill at your pace.", href: "/question-bank", icon: BookOpen },
  { label: "Practice Tests", description: "Get comfortable with timed questions.", href: "/tests", icon: FileText },
  { label: "Mistake Notebook", description: "Return to the concepts you missed.", href: "/mistakes", icon: NotebookPen },
  { label: "Study Plan", description: "Set your target and organize your prep.", href: "/study-plan", icon: CalendarDays }
];

export function DashboardPage() {
  return (
    <StudentShell active="home">
      <main className="mx-auto max-w-7xl space-y-6">
        <header className="hub-card relative isolate overflow-hidden px-6 py-7 sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-3/5 bg-gradient-to-l from-sky-100/80 to-transparent dark:opacity-20" />
          <div className="relative z-10 max-w-xl sm:pr-24">
            <p className="hub-eyebrow">Your learning workspace</p>
            <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"><StudentGreeting greeting="Welcome to SAT Hub" /></h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 sm:text-base">Build confidence one question at a time. Pick a skill to practice or see how your preparation is progressing.</p>
            <Link className="hub-primary mt-5" href="/question-bank">Continue learning <ArrowRight aria-hidden="true" size={17} /></Link>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-8 hidden items-center sm:flex xl:right-16" aria-hidden="true">
            <div className="relative grid size-32 place-items-center rounded-full border border-sky-200 bg-sky-100 text-blue-700 sm:size-36 lg:size-44">
              <span className="absolute -inset-3 rounded-full border border-sky-200/75" />
              <BearIcon size={98} />
            </div>
          </div>
        </header>

        <LearningSnapshot />

        <section aria-labelledby="practice-shortcuts">
          <h2 className="hub-section-title" id="practice-shortcuts">Choose your next step</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {shortcuts.map(({ label, description, href, icon: Icon }) => (
              <Link className="hub-card hub-resource-link flex min-w-0 items-start gap-3 p-4" href={href} key={href}>
                <span className="hub-icon"><Icon aria-hidden="true" size={19} /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-950">{label}</span><span className="mt-1 block text-sm text-slate-600">{description}</span></span>
                <ArrowRight aria-hidden="true" className="mt-1 shrink-0 text-blue-600" size={16} />
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Today’s tasks", detail: "Check your homework workspace for available assignments.", action: "View homework", href: "/homework", icon: ClipboardList },
            { label: "Learning library", detail: "Browse study resources and tools by subject.", action: "Open library", href: "/materials", icon: FolderOpen },
            { label: "Your analytics", detail: "Review your saved attempts and see where you can improve.", action: "View progress", href: "/progress", icon: ChartNoAxesCombined }
          ].map(({ label, detail, action, href, icon: Icon }) => (
            <section className="hub-card flex flex-col items-start p-5" key={href}>
              <span className="hub-icon"><Icon aria-hidden="true" size={18} /></span>
              <h2 className="mt-3 font-semibold text-slate-950">{label}</h2>
              <p className="mt-1 flex-1 text-sm leading-6 text-slate-600">{detail}</p>
              <Link className="mt-3 text-sm font-semibold hub-text-link hover:underline" href={href}>{action}</Link>
            </section>
          ))}
        </div>
      </main>
    </StudentShell>
  );
}
