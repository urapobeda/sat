import { CheckCircle2 } from "lucide-react";
import { QuickStatsCard } from "@/components/question-bank/QuickStatsCard";
import { SmartPracticeCard } from "@/components/question-bank/SmartPracticeCard";
import { WeakAreasCard } from "@/components/question-bank/WeakAreasCard";

export function ProgressSidebar() {
  return (
    <aside className="space-y-5">
      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Your Progress</h2>
        <div className="mt-5 flex items-center gap-6">
          <div
            className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full"
            style={{
              background: "conic-gradient(#2563eb 219.6deg, #e8eef7 0deg)"
            }}
          >
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
              <p className="text-3xl font-black text-slate-950">61%</p>
              <p className="text-xs font-bold text-slate-500">Overall Mastery</p>
            </div>
          </div>

          <div className="space-y-4">
            <ProgressStat label="Answered" value="1,430" />
            <ProgressStat label="Correct" tone="text-emerald-600" value="890" />
            <ProgressStat label="Remaining" tone="text-slate-950" value="540" />
          </div>
        </div>
      </article>

      <QuickStatsCard />
      <WeakAreasCard />
      <SmartPracticeCard />
    </aside>
  );
}

type ProgressStatProps = {
  label: string;
  tone?: string;
  value: string;
};

function ProgressStat({
  label,
  tone = "text-blue-600",
  value
}: ProgressStatProps) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <CheckCircle2 className={tone} size={16} />
        <p className={`text-lg font-black ${tone}`}>{value}</p>
      </div>
      <p className="ml-6 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}
