import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/Button";

export function StudyPlanCard() {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-400" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
            Today&apos;s Study Plan
          </p>
          <p className="mt-1 text-lg font-extrabold text-slate-950">
            Next up: Math Practice
          </p>
        </div>
        <Button
          className="min-h-10 rounded-xl px-4 text-sm"
          href="/practice"
          icon={<ArrowRight size={17} />}
        >
          Continue
        </Button>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-2xl bg-blue-50 px-3 py-2 font-bold text-blue-700">
          15 questions
        </div>
        <div className="rounded-2xl bg-violet-50 px-3 py-2 font-bold text-violet-700">
          Estimated time: 20 min
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2 font-semibold text-slate-600">
            <CheckCircle2 size={16} />
            Daily progress
          </span>
          <span className="font-bold text-slate-950">
            3 / 5 tasks completed
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-blue-600 to-violet-600" />
        </div>
      </div>
    </article>
  );
}
