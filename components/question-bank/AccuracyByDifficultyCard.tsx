import { Target } from "lucide-react";
import { LockedProCard } from "@/components/question-bank/LockedProCard";

export type DifficultyAccuracyRow = {
  accuracy: number | null;
  label: string;
};

export function AccuracyByDifficultyCard({
  rows,
  sectionLabel
}: {
  rows: DifficultyAccuracyRow[];
  sectionLabel: string;
}) {
  const overall = rows.find((row) => row.label === "Medium") ?? rows[0];

  return (
    <LockedProCard subtitle="Accuracy by difficulty" title={sectionLabel}>
      <div className="flex items-center gap-6">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] border-slate-100">
          <div className="absolute inset-0 rounded-full border-[10px] border-slate-300 border-r-transparent border-b-transparent" />
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">
              {overall?.accuracy === null || overall?.accuracy === undefined
                ? "—"
                : `${overall.accuracy}%`}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {rows.map((row) => (
            <div className="flex items-center justify-between gap-3" key={row.label}>
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Target className="text-slate-400" size={14} />
                {row.label}
              </span>
              <span className="text-sm font-bold text-slate-900">
                {row.accuracy === null ? "—" : `${row.accuracy}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </LockedProCard>
  );
}
