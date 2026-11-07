import { LockedProCard } from "@/components/question-bank/LockedProCard";

export type TopicAccuracyRow = {
  accuracy: number | null;
  attempts: number;
  title: string;
};

function tierColor(accuracy: number | null) {
  if (accuracy === null) return "bg-slate-300";
  if (accuracy >= 85) return "bg-slate-300";
  if (accuracy >= 60) return "bg-slate-500";
  return "bg-slate-700";
}

export function AccuracyByTopicCard({
  rows,
  sectionLabel
}: {
  rows: TopicAccuracyRow[];
  sectionLabel: string;
}) {
  return (
    <LockedProCard
      legend={
        <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-300" /> ≥ 85%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-500" /> 60 – 84%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-700" /> &lt; 60%
          </span>
        </div>
      }
      subtitle="Accuracy by topic"
      title={sectionLabel}
    >
      <div className="space-y-4">
        {rows.map((row) => (
          <div className="grid grid-cols-[1fr_auto] items-center gap-4" key={row.title}>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                {row.title}
              </p>
              <p className="text-xs text-slate-400">{row.attempts} attempts</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="relative h-1.5 w-28 rounded-full bg-slate-100">
                <span
                  className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ${tierColor(row.accuracy)}`}
                  style={{ left: `calc(${row.accuracy ?? 0}% - 6px)` }}
                />
              </span>
              <span className="w-10 text-right text-sm font-bold text-slate-700">
                {row.accuracy === null ? "—" : `${row.accuracy}%`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </LockedProCard>
  );
}
