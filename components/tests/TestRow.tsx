import { ArrowRight, FileText } from "lucide-react";
import Link from "next/link";

export type TestItem = {
  completedAt?: string;
  duration: string;
  questions: number;
  score?: number;
  sections: number;
  status?: "In Progress";
  title: string;
};

type TestRowProps = {
  test: TestItem;
};

export function TestRow({ test }: TestRowProps) {
  const isInProgress = test.status === "In Progress";
  const isBestScore = test.score === 1470;

  return (
    <div
      className={[
        "group grid gap-4 rounded-2xl border bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-slate-50 hover:shadow-sm sm:grid-cols-[1fr_auto] sm:items-center",
        isInProgress ? "border-blue-200 bg-blue-50/30" : "border-slate-200"
      ].join(" ")}
    >
      <div className="flex min-w-0 items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <FileText size={24} />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-black text-slate-950">{test.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-slate-500">
            <span>{test.sections} sections</span>
            <span className="hidden text-slate-300 sm:inline">.</span>
            <span>{test.questions} questions</span>
            <span className="hidden text-slate-300 sm:inline">.</span>
            <span>{test.duration}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[150px_112px] sm:items-center">
        <div className="sm:text-left">
          {isInProgress ? (
            <>
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                In Progress
              </span>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Started today
              </p>
            </>
          ) : (
            <>
              <p
                className={[
                  "text-2xl font-black",
                  isBestScore ? "text-emerald-600" : "text-slate-950"
                ].join(" ")}
              >
                {test.score}
                <span className="ml-1 text-sm font-black text-slate-500">
                  /1600
                </span>
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Completed {test.completedAt}
              </p>
            </>
          )}
        </div>

        <Link
          className={[
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-all duration-300",
            isInProgress
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
              : "border border-slate-200 bg-white text-slate-900 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          ].join(" ")}
          href={isInProgress ? "/tests/start" : "/progress"}
        >
          {isInProgress ? "Continue" : "Review"}
          {isInProgress ? <ArrowRight size={16} /> : null}
        </Link>
      </div>
    </div>
  );
}
