import { ArrowRight, ClipboardList, Lightbulb } from "lucide-react";
import type { Question } from "@/data/questions";
import { SidebarCard } from "@/components/practice/SidebarCard";

type ProgressSidebarProps = {
  answeredCount: number;
  answeredQuestionIds: string[];
  correctCount: number;
  questions: Question[];
};

export function ProgressSidebar({
  answeredCount,
  answeredQuestionIds,
  correctCount,
  questions
}: ProgressSidebarProps) {
  const totalQuestions = questions.length;
  const remainingCount = Math.max(totalQuestions - answeredCount, 0);
  const percentage =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const answeredSet = new Set(answeredQuestionIds);
  const mathAnswered = getAnsweredBySection(questions, answeredSet, "math");
  const readingAnswered = getAnsweredBySection(
    questions,
    answeredSet,
    "reading-writing"
  );

  return (
    <aside className="space-y-5">
      <SidebarCard>
        <h2 className="text-lg font-black text-slate-950">Your Progress</h2>
        <div className="mt-5 flex items-center gap-6">
          <div
            className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#2563eb ${percentage * 3.6}deg, #e8eef7 0deg)`
            }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-2xl font-black text-slate-950">
              {percentage}%
            </div>
          </div>

          <div className="grid gap-3 text-sm">
            <ProgressStat label="Answered" value={String(answeredCount)} />
            <ProgressStat label="Remaining" value={String(remainingCount)} />
            <ProgressStat
              label="Correct"
              tone="text-emerald-600"
              value={String(correctCount)}
            />
          </div>
        </div>
      </SidebarCard>

      <SidebarCard>
        <h2 className="text-lg font-black text-slate-950">Section Overview</h2>
        <div className="mt-5 space-y-5">
          <SectionProgress
            label="Math"
            total={totalQuestions}
            value={mathAnswered}
          />
          <SectionProgress
            label="Reading & Writing"
            total={totalQuestions}
            value={readingAnswered}
          />
        </div>
      </SidebarCard>

      <SidebarCard>
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-0.5 shrink-0 text-orange-500" size={20} />
          <div>
            <h2 className="text-lg font-black text-slate-950">Tips</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Read each question carefully and take your time. You can review your
              answers before submitting.
            </p>
          </div>
        </div>
      </SidebarCard>

      <SidebarCard className="group cursor-pointer">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <ClipboardList size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-black text-blue-600">Review Answers</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Review your answers after completing
            </p>
          </div>
          <ArrowRight
            className="shrink-0 text-blue-600 transition group-hover:translate-x-1"
            size={21}
          />
        </div>
      </SidebarCard>
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
      <p className={`text-lg font-black ${tone}`}>{value}</p>
      <p className="text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

type SectionProgressProps = {
  label: string;
  total: number;
  value: number;
};

function SectionProgress({ label, total, value }: SectionProgressProps) {
  const width = total > 0 ? `${Math.round((value / total) * 100)}%` : "0%";

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-black text-slate-950">{label}</span>
        <span className="font-bold text-slate-500">
          {value} / {total}
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-600" style={{ width }} />
      </div>
    </div>
  );
}

function getAnsweredBySection(
  questions: Question[],
  answeredSet: Set<string>,
  section: Question["section"]
) {
  return questions.filter(
    (question) => question.section === section && answeredSet.has(question.id)
  ).length;
}
