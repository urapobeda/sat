import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { SectionFilter } from "@/lib/questions";

type SectionSummaryCardProps = {
  description: string;
  icon: LucideIcon;
  mastery: number;
  questions: string;
  section: Exclude<SectionFilter, "all">;
  title: string;
  topics: string;
  tone: string;
};

export function SectionSummaryCard({
  description,
  icon: Icon,
  mastery,
  questions,
  section,
  title,
  topics,
  tone
}: SectionSummaryCardProps) {
  const barTone = section === "math" ? "bg-blue-600" : "bg-violet-600";
  const bgTone =
    section === "math"
      ? "bg-gradient-to-r from-blue-50 to-white"
      : "bg-gradient-to-r from-violet-50 to-white";

  return (
    <article
      className={`grid gap-5 rounded-2xl border border-slate-200 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md lg:grid-cols-[1fr_280px_auto] lg:items-center ${bgTone}`}
    >
      <div className="flex items-start gap-5">
        <span
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-lg`}
        >
          <Icon size={34} />
        </span>
        <div>
          <h3 className="text-xl font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-slate-600">
            <span>{questions}</span>
            <span className="hidden text-slate-300 sm:inline">.</span>
            <span>{topics}</span>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-end gap-2">
          <span className="text-lg font-black text-slate-950">{mastery}%</span>
          <span className="pb-0.5 text-xs font-bold text-slate-500">Mastery</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full ${barTone}`}
            style={{ width: `${mastery}%` }}
          />
        </div>
      </div>

      <Link
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 lg:justify-self-end"
        href={`/question-bank/practice?section=${section}`}
      >
        Practice
        <ArrowRight size={17} />
      </Link>
    </article>
  );
}
