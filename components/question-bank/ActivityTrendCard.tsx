import { CheckCircle2, XCircle } from "lucide-react";

type WeekActivity = {
  correct: number;
  label: string;
  wrong: number;
};

// Placeholder weekly breakdown — Supabase does not aggregate practice
// activity by week yet, so this chart illustrates the layout only.
const activityWeeks: WeekActivity[] = [
  { label: "Jun 4", correct: 18, wrong: 2 },
  { label: "Jun 25", correct: 0, wrong: 0 },
  { label: "Jul 16", correct: 0, wrong: 0 },
  { label: "Aug 6", correct: 54, wrong: 3 },
  { label: "Aug 27", correct: 24, wrong: 2 },
  { label: "Sep 17", correct: 0, wrong: 0 },
  { label: "Oct 8", correct: 9, wrong: 1 },
  { label: "Oct 29", correct: 0, wrong: 0 }
];

const CHART_MAX = 60;

export function ActivityTrendCard() {
  const totalCorrect = activityWeeks.reduce((sum, week) => sum + week.correct, 0);
  const totalWrong = activityWeeks.reduce((sum, week) => sum + week.wrong, 0);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-bold text-slate-950">Activity trend</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Wrong in red, correct in green. Each bar is one calendar week.
      </p>

      <div className="mt-4 flex items-center gap-6">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CheckCircle2 className="text-emerald-500" size={18} />
          {totalCorrect} Correct
        </span>
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <XCircle className="text-rose-500" size={18} />
          {totalWrong} Wrong
        </span>
      </div>

      <div className="mt-6 flex h-40 items-end gap-3 border-b border-slate-100 pb-1 sm:gap-5">
        {activityWeeks.map((week) => {
          const correctHeight = Math.min(100, (week.correct / CHART_MAX) * 100);
          const wrongHeight = Math.min(100, (week.wrong / CHART_MAX) * 100);

          return (
            <div
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              key={week.label}
            >
              <div className="flex h-full w-full max-w-5 flex-col items-stretch justify-end overflow-hidden rounded-t-sm">
                <div
                  className="w-full shrink-0 bg-rose-400"
                  style={{ height: `${wrongHeight}%` }}
                />
                <div
                  className="w-full shrink-0 bg-emerald-500"
                  style={{ height: `${correctHeight}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-3 text-[11px] font-semibold text-slate-400 sm:gap-5">
        {activityWeeks.map((week) => (
          <span className="flex-1 text-center" key={week.label}>
            {week.label}
          </span>
        ))}
      </div>
    </section>
  );
}
