"use client";

import { ArrowUpRight, BookOpen, Calculator, ClipboardList, FileText, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeading } from "@/components/dashboard/PageHeading";
import { StudentShell } from "@/components/dashboard/StudentShell";

const subjects = ["All", "Math", "Reading & Writing", "General"] as const;
const resources = [
  { title: "Math Question Bank", description: "Practice by skill and difficulty. Includes figures, tables and worked explanations.", subject: "Math", type: "Practice", href: "/question-bank/math", icon: BookOpen },
  { title: "Reading & Writing Question Bank", description: "Work through vocabulary, reading comprehension, grammar and more.", subject: "Reading & Writing", type: "Practice", href: "/question-bank/reading-writing", icon: BookOpen },
  { title: "SAT Score Estimator", description: "Explore unofficial score ranges with separate Math and Reading & Writing modules.", subject: "General", type: "Tool", href: "/tools/sat-score-calculator", icon: Calculator },
  { title: "Personal Study Plan", description: "Set a target score and choose a schedule that fits your preparation.", subject: "General", type: "Planner", href: "/study-plan", icon: ClipboardList }
] as const;

export function MaterialsPage() {
  const [subject, setSubject] = useState<(typeof subjects)[number]>("All");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = resources.filter((item) =>
    (subject === "All" || item.subject === subject) &&
    `${item.title} ${item.description} ${item.type} ${item.subject}`.toLowerCase().includes(needle)
  );

  return (
    <StudentShell active="materials">
      <main className="mx-auto max-w-7xl space-y-5">
        <PageHeading eyebrow="Learning library" title="Materials" description="Find SAT Hub study resources and tools. Teacher-shared files will appear here when available." />
        <section aria-label="Browse resources" className="space-y-4">
          <div className="hub-card flex flex-wrap items-center gap-3 p-3">
            <label className="relative min-w-0 flex-1 basis-48">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
              <input aria-label="Search resources" className="min-h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-950" onChange={(event) => setQuery(event.target.value)} placeholder="Search resources" value={query} />
            </label>
            <div aria-label="Subject" className="flex flex-wrap gap-1" role="group">
              {subjects.map((item) => <button aria-pressed={item === subject} className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 aria-pressed:bg-blue-50 aria-pressed:text-blue-700" key={item} onClick={() => setSubject(item)} type="button">{item}</button>)}
            </div>
          </div>
          <p className="text-sm text-slate-600" role="status">{visible.length} {visible.length === 1 ? "resource" : "resources"}</p>
          {visible.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {visible.map(({ title, description, subject, type, href, icon: Icon }) => (
                <Link className="hub-card hub-resource-link flex min-w-0 gap-3 p-5" href={href} key={href}>
                  <span className="hub-icon"><Icon aria-hidden="true" size={19} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="hub-eyebrow">{type} · {subject}</p>
                    <h2 className="mt-1 text-base font-semibold text-slate-950">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                  <ArrowUpRight aria-hidden="true" className="shrink-0 text-slate-500" size={17} />
                </Link>
              ))}
            </div>
          ) : <p className="hub-card p-5 text-sm text-slate-600">No resources match your search.</p>}
        </section>
        <section className="hub-card flex items-start gap-3 p-5">
          <span className="hub-icon"><FileText aria-hidden="true" size={19} /></span>
          <div><h2 className="font-semibold text-slate-950">Teacher files</h2><p className="mt-1 text-sm text-slate-600">No downloadable files are available.</p></div>
        </section>
      </main>
    </StudentShell>
  );
}
