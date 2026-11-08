import { Clock3 } from "lucide-react";
import { LockedProCard } from "@/components/question-bank/LockedProCard";

export type DifficultyTimeRow = {
  attempts: number;
  avgSeconds: number | null;
  totalSeconds: number;
  label: string;
};

function formatSeconds(seconds: number) {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;

  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

export function TimeShareByDifficultyCard({
  rows,
  sectionLabel
}: {
  rows: DifficultyTimeRow[];
  sectionLabel: string;
}) {
  const hasData = rows.some((row) => row.avgSeconds !== null);
  const totalAttempts = rows.reduce((sum, row) => sum + row.attempts, 0);
  const overallAverage = totalAttempts ? rows.reduce((sum, row) => sum + row.totalSeconds, 0) / totalAttempts : null;

  return (
    <LockedProCard
      subtitle="Average correct-answer time by difficulty"
      title={sectionLabel}
    >
      {!hasData ? (
        <p className="text-sm text-slate-500">
          Solve {sectionLabel} questions correctly in Practice to see your pace
          here.
        </p>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] border-slate-100">
            <div className="absolute inset-0 rounded-full border-[10px] border-slate-300 border-r-transparent border-b-transparent" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">
                {overallAverage === null
                  ? "—"
                  : formatSeconds(overallAverage)}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            {rows.map((row) => (
              <div
                className="flex items-center justify-between gap-3"
                key={row.label}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Clock3 className="text-slate-400" size={14} />
                  {row.label}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {row.avgSeconds === null ? "—" : formatSeconds(row.avgSeconds)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {row.attempts} correct
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </LockedProCard>
  );
}
