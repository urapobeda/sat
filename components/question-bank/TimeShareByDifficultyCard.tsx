import { Clock3 } from "lucide-react";
import { LockedProCard } from "@/components/question-bank/LockedProCard";

export type DifficultyTimeRow = {
  attempts: number;
  avgSeconds: number | null;
  label: string;
};

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);

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
  const overall = rows.find((row) => row.label === "Medium") ?? rows[0];

  return (
    <LockedProCard
      subtitle="Average time per question, by difficulty"
      title={sectionLabel}
    >
      {!hasData ? (
        <p className="text-sm text-slate-500">
          Answer some {sectionLabel} questions in Practice to see your pace
          here.
        </p>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] border-slate-100">
            <div className="absolute inset-0 rounded-full border-[10px] border-slate-300 border-r-transparent border-b-transparent" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">
                {overall?.avgSeconds === null || overall?.avgSeconds === undefined
                  ? "—"
                  : formatSeconds(overall.avgSeconds)}
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
                    {row.attempts} timed
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
