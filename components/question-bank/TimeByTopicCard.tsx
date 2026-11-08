import { LockedProCard } from "@/components/question-bank/LockedProCard";
import { formatTime } from "@/components/quiz/Timer";
import type { TimingSummary } from "@/lib/practiceTiming";

export function TimeByTopicCard({ rows, sectionLabel }: {
  rows: (TimingSummary & { label: string })[];
  sectionLabel: string;
}) {
  const timed = rows.filter((row) => row.attempts > 0);
  const maximum = Math.max(1, ...timed.map((row) => row.avgSeconds ?? 0));
  return (
    <LockedProCard title={sectionLabel} subtitle="Average correct-answer time by topic">
      <p className="text-xs text-slate-500">Only correct answers are counted. Each question is timed separately.</p>
      {timed.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Solve questions correctly to see your time for each topic here.</p>
      ) : (
        <div className="mt-4 max-h-96 space-y-4 overflow-y-auto pr-1">
          {timed.map((row) => (
            <div key={row.label}>
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="font-semibold leading-5 text-slate-700">{row.label}</span>
                <span className="shrink-0 text-right">
                  <span className="font-bold text-slate-900">{formatTime(Math.round(row.avgSeconds ?? 0))}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{row.attempts} correct</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${((row.avgSeconds ?? 0) / maximum) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </LockedProCard>
  );
}
