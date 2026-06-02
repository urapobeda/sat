import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import Link from "next/link";
import { ProgressBar } from "@/components/quiz/ProgressBar";

type ResultsCardProps = {
  backHref?: string;
  backLabel?: string;
  onRestart: () => void;
  percentage: number;
  score: number;
  title?: string;
  total: number;
  weakTopics?: string[];
};

export function ResultsCard({
  backHref = "/question-bank",
  backLabel = "Back to Question Bank",
  onRestart,
  percentage,
  score,
  title = "Session Complete",
  total,
  weakTopics = []
}: ResultsCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Trophy size={34} />
      </div>
      <h2 className="mt-5 text-3xl font-black text-slate-950">{title}</h2>
      <p className="mt-3 text-lg font-bold text-slate-600">
        {score} of {total} correct
      </p>
      <p className="mt-2 text-4xl font-black text-blue-600">{percentage}%</p>
      <ProgressBar className="mx-auto mt-5 max-w-md" value={percentage} />

      <div className="mx-auto mt-6 max-w-xl rounded-2xl bg-slate-50 p-5 text-left">
        <p className="text-sm font-black text-slate-950">Weak topics</p>
        {weakTopics.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {weakTopics.map((topic) => (
              <span
                className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700"
                key={topic}
              >
                {topic}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            Nice work. No weak topics stood out in this session.
          </p>
        )}
      </div>

      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          onClick={onRestart}
          type="button"
        >
          <RotateCcw size={18} />
          Practice Again
        </button>
        <Link
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          href={backHref}
        >
          <ArrowLeft size={18} />
          {backLabel}
        </Link>
      </div>
    </article>
  );
}
