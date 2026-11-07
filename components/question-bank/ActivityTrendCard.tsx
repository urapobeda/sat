import { CheckCircle2, XCircle } from "lucide-react";
import type { WeeklyActivityPoint } from "@/lib/supabase/queries";

const CHART_MAX_FLOOR = 10;
const MAX_WEEKS_SHOWN = 10;

function formatWeekLabel(weekStartIso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(`${weekStartIso}T00:00:00`));
}

export function ActivityTrendCard({
  isSignedIn,
  weeks
}: {
  isSignedIn: boolean;
  weeks: WeeklyActivityPoint[];
}) {
  const recentWeeks = weeks.slice(-MAX_WEEKS_SHOWN);
  const totalCorrect = weeks.reduce((sum, week) => sum + week.correct, 0);
  const totalWrong = weeks.reduce((sum, week) => sum + week.wrong, 0);
  const chartMax = Math.max(
    CHART_MAX_FLOOR,
    ...recentWeeks.map((week) => week.correct + week.wrong)
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-bold text-slate-950">Activity trend</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Wrong in red, correct in green. Each bar is one calendar week.
      </p>

      {!isSignedIn ? (
        <p className="mt-5 text-sm text-slate-500">
          Sign in and answer some questions to see your activity trend here.
        </p>
      ) : recentWeeks.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">
          No practice activity yet. Answer questions in the Question Bank to
          start building your trend.
        </p>
      ) : (
        <>
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
            {recentWeeks.map((week) => {
              const correctHeight = Math.min(
                100,
                (week.correct / chartMax) * 100
              );
              const wrongHeight = Math.min(100, (week.wrong / chartMax) * 100);

              return (
                <div
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                  key={week.weekStart}
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
            {recentWeeks.map((week) => (
              <span className="flex-1 text-center" key={week.weekStart}>
                {formatWeekLabel(week.weekStart)}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
