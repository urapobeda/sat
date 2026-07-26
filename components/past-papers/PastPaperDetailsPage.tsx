"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import {
  formatPaperDifficulty,
  formatPaperMode,
  formatPaperType,
  formatSourceType,
  type PaperWithStats
} from "@/lib/pastPapers";
import { getCurrentUser } from "@/lib/supabase/queries";
import { getPublishedPaperBySlug, type PaperDetail } from "@/lib/supabase/pastPapers";

type PastPaperDetailsPageProps = {
  slug: string;
};

export function PastPaperDetailsPage({ slug }: PastPaperDetailsPageProps) {
  const [paper, setPaper] = useState<PaperDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPaper = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await getCurrentUser().catch(() => null);
      setPaper(await getPublishedPaperBySlug(slug, user?.id));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Paper details could not be loaded."
      );
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPaper();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadPaper]);

  const weakSkills = useMemo(() => getWeakSkills(paper), [paper]);
  const averageAccuracy = useMemo(() => getAverageAccuracy(paper), [paper]);

  return (
    <Layout>
      <Link
        className="inline-flex items-center gap-2 text-sm font-black text-blue-600 transition hover:text-blue-700"
        href="/past-papers"
      >
        <ArrowLeft size={17} />
        Back to Past Papers
      </Link>

      {isLoading ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-black text-blue-600">
            <Loader2 className="animate-spin" size={20} />
            Loading paper details from Supabase...
          </div>
          <div className="mt-6 h-72 animate-pulse rounded-3xl bg-slate-100" />
        </section>
      ) : error ? (
        <ErrorCard message={error} onRetry={() => void loadPaper()} />
      ) : !paper ? (
        <EmptyCard />
      ) : (
        <>
          <section className="mt-6 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-white shadow-soft">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <div className="flex flex-wrap gap-2 text-xs font-black">
                  <Badge>{formatPaperType(paper.paper_type)}</Badge>
                  <Badge>{formatPaperMode(paper.mode)}</Badge>
                  <Badge>{formatPaperDifficulty(paper.difficulty)}</Badge>
                  <Badge>{paper.year ?? "No year"}</Badge>
                </div>
                <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
                  {paper.title}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                  {paper.description ?? "No description provided."}
                </p>
                <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/80 p-4 text-sm font-bold leading-6 text-amber-900">
                  This platform is not affiliated with or endorsed by College
                  Board. This paper is labeled {formatSourceType(paper.source_type)}
                  and uses stored source/license notes.
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.12em] text-blue-600">
                  Paper Status
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  {paper.status.replace("-", " ")}
                </h2>
                <ProgressBar className="mt-4" value={paper.progressPercentage} />
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Metric label="Best Score" value={paper.bestScore ? `${paper.bestScore}` : "-"} />
                  <Metric label="Accuracy" value={`${averageAccuracy}%`} />
                  <Metric label="Modules" value={String(paper.moduleCount)} />
                  <Metric label="Questions" value={String(paper.questionCount)} />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-6">
              <ActionPanel paper={paper} />
              <ModulePanel paper={paper} />
              <AttemptsPanel paper={paper} />
            </div>
            <aside className="space-y-6">
              <InfoPanel paper={paper} />
              <BeforeStartPanel paper={paper} />
              <RecommendationsPanel weakSkills={weakSkills} />
            </aside>
          </section>
        </>
      )}
    </Layout>
  );
}

function ActionPanel({ paper }: { paper: PaperWithStats }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-2xl font-black text-slate-950">Start Options</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Paper runner will reuse the existing locked Test Mode components. For now,
        use these actions to start from the correct paper context.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ActionButton href={`/past-papers/${paper.slug}/start`} label="Start Full Paper" />
        <ActionButton href={`/past-papers/${paper.slug}/start?section=reading-writing`} label="Start Reading & Writing Only" />
        <ActionButton href={`/past-papers/${paper.slug}/start?section=math`} label="Start Math Only" />
        <ActionButton href="/progress" label="Review Previous Attempt" variant="secondary" />
      </div>
    </article>
  );
}

function ModulePanel({ paper }: { paper: PaperWithStats }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-2xl font-black text-slate-950">Modules</h2>
      <div className="mt-5 space-y-3">
        {paper.modules.map((module) => (
          <div
            className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto]"
            key={module.id}
          >
            <div>
              <p className="font-black text-slate-950">
                {module.section === "math" ? "Math" : "Reading & Writing"} Module{" "}
                {module.module_number}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-600">
                Route: {module.route_type ?? "base"} / {module.question_count} questions
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200">
              <Clock3 size={15} />
              {Math.round(module.duration_seconds / 60)} min
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function AttemptsPanel({ paper }: { paper: PaperWithStats }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-2xl font-black text-slate-950">Previous Attempts</h2>
      {paper.attempts.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-slate-600">
          No attempts yet. Start this paper to build score history.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {paper.attempts.slice(0, 5).map((attempt) => (
            <div
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              key={attempt.id}
            >
              <div>
                <p className="font-black text-slate-950">
                  {attempt.status.replace("-", " ")}
                </p>
                <p className="text-sm font-bold text-slate-500">
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                    new Date(attempt.completed_at ?? attempt.started_at)
                  )}
                </p>
              </div>
              <span className="rounded-full bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-200">
                {attempt.estimated_score ?? "-"} / 1600
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function InfoPanel({ paper }: { paper: PaperWithStats }) {
  const items = [
    ["Source", paper.source_name ?? formatSourceType(paper.source_type)],
    ["License", paper.license_notes ?? "No license notes"],
    ["Scoring", "400-1600 estimated SAT score"],
    ["Adaptive", paper.mode === "adaptive" ? "Enabled" : "No"],
    ["Duration", `${paper.estimated_minutes ?? 0} minutes`]
  ];

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Test Information</h2>
      <div className="mt-4 space-y-4">
        {items.map(([label, value]) => (
          <div className="flex items-start gap-3" key={label}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck size={17} />
            </span>
            <div>
              <p className="font-black text-slate-950">{label}</p>
              <p className="text-sm leading-5 text-slate-600">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function BeforeStartPanel({ paper }: { paper: PaperWithStats }) {
  const rules = [
    "Timer runs continuously in locked test mode.",
    "Breaks are not included in module time.",
    paper.paper_type === "math" || paper.paper_type === "full-length"
      ? "Calculator and reference sheet are available for Math modules."
      : "Use annotations and careful passage evidence for Reading & Writing.",
    "Answers and explanations stay hidden until completion.",
    "Module navigation locks after submission."
  ];

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Before You Start</h2>
      <div className="mt-4 space-y-3">
        {rules.map((rule) => (
          <div className="flex gap-3 text-sm font-bold leading-6 text-slate-600" key={rule}>
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={17} />
            {rule}
          </div>
        ))}
      </div>
    </article>
  );
}

function RecommendationsPanel({ weakSkills }: { weakSkills: string[] }) {
  return (
    <article className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-600 to-blue-600 p-5 text-white shadow-lg shadow-violet-600/20">
      <Sparkles size={28} />
      <h2 className="mt-4 text-xl font-black">Recommended Review</h2>
      {weakSkills.length === 0 ? (
        <p className="mt-2 text-sm font-bold leading-6 text-white/85">
          Complete attempts to unlock skill-level recommendations.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {weakSkills.map((skill) => (
            <p className="rounded-2xl bg-white/15 px-3 py-2 text-sm font-black" key={skill}>
              {skill}
            </p>
          ))}
        </div>
      )}
    </article>
  );
}

function ActionButton({
  href,
  label,
  variant = "primary"
}: {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      className={[
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition",
        variant === "primary"
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
          : "border border-slate-200 bg-white text-slate-900 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      ].join(" ")}
      href={href}
    >
      {label}
      <ArrowRight size={17} />
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center ring-1 ring-slate-100">
      <p className="text-xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white px-3 py-1 text-slate-600 shadow-sm ring-1 ring-slate-200">
      {children}
    </span>
  );
}

function ErrorCard({
  message,
  onRetry
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-6 rounded-3xl border border-rose-100 bg-rose-50 p-6 text-center shadow-sm">
      <RotateCcw className="mx-auto text-rose-600" size={30} />
      <h2 className="mt-3 text-xl font-black text-rose-900">
        Paper details could not be loaded.
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-rose-700">
        {message}
      </p>
      <button
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-black text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700"
        onClick={onRetry}
        type="button"
      >
        Retry
      </button>
    </div>
  );
}

function EmptyCard() {
  return (
    <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50/70 p-8 text-center shadow-sm">
      <FileText className="mx-auto text-blue-600" size={34} />
      <h2 className="mt-4 text-2xl font-black text-slate-950">
        Paper not found
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        This paper is missing, unpublished, or not available under current RLS
        policies.
      </p>
    </div>
  );
}

function getAverageAccuracy(paper: PaperWithStats | null) {
  if (!paper || paper.attempts.length === 0) {
    return 0;
  }

  const scoredAttempts = paper.attempts.filter(
    (attempt) => typeof attempt.raw_score === "number"
  );

  if (scoredAttempts.length === 0 || paper.questionCount === 0) {
    return 0;
  }

  return Math.round(
    scoredAttempts.reduce((sum, attempt) => sum + (attempt.raw_score ?? 0), 0) /
      (scoredAttempts.length * paper.questionCount) *
      100
  );
}

function getWeakSkills(paper: PaperWithStats | null) {
  if (!paper || paper.attempts.length === 0) {
    return [];
  }

  return ["Review incorrect answers", "Practice timing", "Revisit marked questions"];
}
