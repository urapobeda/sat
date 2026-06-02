import { CheckCircle2 } from "lucide-react";
import { QuickStatsCard } from "@/components/question-bank/QuickStatsCard";
import { SmartPracticeCard } from "@/components/question-bank/SmartPracticeCard";
import { WeakAreasCard } from "@/components/question-bank/WeakAreasCard";
import type { TopicSummary } from "@/lib/questions";

type ProgressSidebarProps = {
  questionsAnswered: number;
  totalQuestions: number;
  totalTopics: number;
  topicSummaries: TopicSummary[];
};

export function ProgressSidebar({
  questionsAnswered,
  totalQuestions,
  totalTopics,
  topicSummaries
}: ProgressSidebarProps) {
  const correct = Math.round(questionsAnswered * 0.62);
  const remaining = Math.max(totalQuestions - questionsAnswered, 0);
  const mastery = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
  const conic = `conic-gradient(#2563eb ${mastery * 3.6}deg, #e8eef7 0deg)`;

  return (
    <aside className="space-y-5">
      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Your Progress</h2>
        <div className="mt-5 flex items-center gap-6">
          <div
            className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full"
            style={{ background: conic }}
          >
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
              <p className="text-3xl font-black text-slate-950">{mastery}%</p>
              <p className="text-xs font-bold text-slate-500">Overall Mastery</p>
            </div>
          </div>

          <div className="space-y-4">
            <ProgressStat label="Answered" value={questionsAnswered.toLocaleString()} />
            <ProgressStat label="Correct" tone="text-emerald-600" value={correct.toLocaleString()} />
            <ProgressStat label="Remaining" tone="text-slate-950" value={remaining.toLocaleString()} />
          </div>
        </div>
      </article>

      <QuickStatsCard totalQuestions={totalQuestions} totalTopics={totalTopics} />
      <WeakAreasCard topics={topicSummaries} />
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
