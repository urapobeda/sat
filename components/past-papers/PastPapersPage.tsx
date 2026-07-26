"use client";

import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Clock3,
  FileText,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import {
  filterPapers,
  formatPaperDifficulty,
  formatPaperMode,
  formatPaperType,
  formatSourceType,
  sortPapers,
  type PaperSort,
  type PaperWithStats
} from "@/lib/pastPapers";
import { getCurrentUser } from "@/lib/supabase/queries";
import {
  getPublishedPapers,
  togglePaperBookmark
} from "@/lib/supabase/pastPapers";

const filterOptions = {
  paperType: [
    ["all", "All Types"],
    ["full-length", "Full-Length"],
    ["reading-writing", "Reading & Writing"],
    ["math", "Math"],
    ["mini-test", "Mini Test"]
  ],
  mode: [
    ["all", "All Modes"],
    ["adaptive", "Adaptive"],
    ["linear", "Linear"],
    ["untimed-practice", "Untimed Practice"]
  ],
  difficulty: [
    ["all", "All Levels"],
    ["foundation", "Foundation"],
    ["standard", "Standard"],
    ["advanced", "Advanced"]
  ],
  status: [
    ["all", "All Status"],
    ["not-started", "Not Started"],
    ["in-progress", "In Progress"],
    ["completed", "Completed"]
  ],
  source: [
    ["all", "All Sources"],
    ["original", "Original"],
    ["licensed", "Licensed"],
    ["public-permission", "Publicly Permitted"]
  ],
  sort: [
    ["recommended", "Recommended"],
    ["newest", "Newest"],
    ["oldest", "Oldest"],
    ["difficulty", "Difficulty"],
    ["best-score", "Best Score"]
  ]
} satisfies Record<string, Array<[string, string]>>;

export function PastPapersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [papers, setPapers] = useState<PaperWithStats[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      difficulty: searchParams.get("difficulty") ?? "all",
      mode: searchParams.get("mode") ?? "all",
      paperType: searchParams.get("type") ?? "all",
      search: searchParams.get("q") ?? "",
      sort: (searchParams.get("sort") ?? "recommended") as PaperSort,
      source: searchParams.get("source") ?? "all",
      status: searchParams.get("status") ?? "all",
      year: searchParams.get("year") ?? "all"
    }),
    [searchParams]
  );

  const loadPapers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await getCurrentUser().catch(() => null);
      const loadedPapers = await getPublishedPapers(user?.id);
      setUserId(user?.id ?? null);
      setPapers(loadedPapers);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Past papers could not be loaded."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPapers();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadPapers]);

  const years = useMemo(
    () =>
      Array.from(new Set(papers.map((paper) => paper.year).filter(Boolean)))
        .map(String)
        .sort((first, second) => Number(second) - Number(first)),
    [papers]
  );
  const visiblePapers = useMemo(
    () => sortPapers(filterPapers(papers, filters), filters.sort),
    [filters, papers]
  );

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function handleBookmark(paper: PaperWithStats) {
    if (!userId) {
      setSuccessMessage("Sign in to save paper bookmarks.");
      return;
    }

    try {
      await togglePaperBookmark({
        isBookmarked: paper.isBookmarked,
        paperId: paper.id,
        userId
      });
      setSuccessMessage(paper.isBookmarked ? "Bookmark removed." : "Paper bookmarked.");
      await loadPapers();
    } catch (bookmarkError) {
      setError(
        bookmarkError instanceof Error
          ? bookmarkError.message
          : "Bookmark could not be updated."
      );
    }
  }

  return (
    <Layout>
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-white p-6 shadow-soft sm:p-8">
        <div className="pointer-events-none absolute right-8 top-8 hidden h-28 w-28 rounded-3xl bg-gradient-to-br from-blue-600 to-violet-600 opacity-10 blur-2xl sm:block" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-blue-600">
              Phase 1 Library
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              Past Papers & Mock Exams
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              Practice complete Digital SAT-style papers, sectional tests, and
              adaptive mock exams.
            </p>
          </div>
          <div className="rounded-3xl border border-amber-100 bg-amber-50/80 p-4 text-sm font-bold leading-6 text-amber-900 shadow-sm lg:max-w-md">
            This platform is not affiliated with or endorsed by College Board.
            Exam materials are original, licensed, or publicly permitted for
            educational use.
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(6,minmax(0,1fr))]">
          <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 focus-within:ring-4 focus-within:ring-blue-100">
            <Search className="shrink-0 text-slate-400" size={18} />
            <input
              className="w-full bg-transparent outline-none placeholder:text-slate-400"
              onChange={(event) => updateParam("q", event.target.value)}
              placeholder="Search papers..."
              value={filters.search}
            />
          </label>
          <FilterSelect
            label="Paper Type"
            onChange={(value) => updateParam("type", value)}
            options={filterOptions.paperType}
            value={filters.paperType}
          />
          <FilterSelect
            label="Mode"
            onChange={(value) => updateParam("mode", value)}
            options={filterOptions.mode}
            value={filters.mode}
          />
          <FilterSelect
            label="Difficulty"
            onChange={(value) => updateParam("difficulty", value)}
            options={filterOptions.difficulty}
            value={filters.difficulty}
          />
          <FilterSelect
            label="Status"
            onChange={(value) => updateParam("status", value)}
            options={filterOptions.status}
            value={filters.status}
          />
          <FilterSelect
            label="Source"
            onChange={(value) => updateParam("source", value)}
            options={filterOptions.source}
            value={filters.source}
          />
          <FilterSelect
            label="Sort"
            onChange={(value) => updateParam("sort", value)}
            options={filterOptions.sort}
            value={filters.sort}
          />
        </div>
        <div className="mt-3 max-w-xs">
          <FilterSelect
            label="Year"
            onChange={(value) => updateParam("year", value)}
            options={[["all", "All Years"], ...years.map((year) => [year, year] as [string, string])]}
            value={filters.year}
          />
        </div>
      </section>

      {successMessage ? (
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <section className="mt-6">
        {isLoading ? (
          <PaperSkeleton />
        ) : error ? (
          <ErrorCard message={error} onRetry={() => void loadPapers()} />
        ) : papers.length === 0 ? (
          <EmptyCard
            description="Run the Past Papers migration and seed SQL to publish demo papers from your existing question bank."
            title="No published papers yet"
          />
        ) : visiblePapers.length === 0 ? (
          <EmptyCard
            description="Try changing the search, filters, year, or sort."
            title="No papers match these filters"
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {visiblePapers.map((paper) => (
              <PaperCard
                key={paper.id}
                onBookmark={() => void handleBookmark(paper)}
                paper={paper}
              />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}

function PaperCard({
  onBookmark,
  paper
}: {
  onBookmark: () => void;
  paper: PaperWithStats;
}) {
  const actionLabel =
    paper.status === "in-progress"
      ? "Continue"
      : paper.status === "completed"
        ? "Review"
        : "Start Paper";
  const latestAttempt = paper.latestAttemptDate
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
        new Date(paper.latestAttemptDate)
      )
    : "No attempts yet";

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
      <div className="h-28 bg-gradient-to-br from-blue-600 via-violet-600 to-emerald-400 p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black backdrop-blur">
            {formatPaperType(paper.paper_type)}
          </span>
          <button
            aria-label="Toggle paper bookmark"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
            onClick={onBookmark}
            type="button"
          >
            <Bookmark
              fill={paper.isBookmarked ? "currentColor" : "none"}
              size={18}
            />
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-black">
          <Badge>{paper.year ?? "No year"}</Badge>
          <Badge>{formatPaperMode(paper.mode)}</Badge>
          <Badge>{formatPaperDifficulty(paper.difficulty)}</Badge>
          <Badge>{formatSourceType(paper.source_type)}</Badge>
        </div>
        <h2 className="mt-4 text-2xl font-black text-slate-950">{paper.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {paper.description ?? "No description provided."}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric icon={FileText} label="Modules" value={String(paper.moduleCount)} />
          <Metric icon={CheckCircle2} label="Questions" value={String(paper.questionCount)} />
          <Metric icon={Clock3} label="Duration" value={`${paper.estimated_minutes ?? 0}m`} />
        </div>

        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {paper.status.replace("-", " ")}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-700">
                Best score: {paper.bestScore ?? "-"} / 1600
              </p>
            </div>
            <p className="text-xs font-bold text-slate-500">{latestAttempt}</p>
          </div>
          <ProgressBar className="mt-3" value={paper.progressPercentage} />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            href={`/past-papers/${paper.slug}`}
          >
            {actionLabel}
            <ArrowRight size={17} />
          </Link>
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            href={`/past-papers/${paper.slug}`}
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  value: string;
}) {
  return (
    <label className="grid min-h-12 gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">
      {label}
      <select
        className="bg-transparent text-sm font-black text-slate-950 outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <Icon className="text-blue-600" size={18} />
      <p className="mt-3 text-lg font-black text-slate-950">{value}</p>
      <p className="text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-600 ring-1 ring-slate-200">
      {children}
    </span>
  );
}

function PaperSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div className="h-96 animate-pulse rounded-3xl bg-slate-100" key={item} />
      ))}
    </div>
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
    <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-center shadow-sm">
      <Search className="mx-auto text-rose-600" size={30} />
      <h2 className="mt-3 text-xl font-black text-rose-900">
        Past papers could not be loaded.
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-rose-700">
        {message}
      </p>
      <button
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-black text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700"
        onClick={onRetry}
        type="button"
      >
        <RotateCcw size={17} />
        Retry
      </button>
    </div>
  );
}

function EmptyCard({
  description,
  title
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-8 text-center shadow-sm">
      <ShieldCheck className="mx-auto text-blue-600" size={34} />
      <h2 className="mt-4 text-2xl font-black text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {description}
      </p>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-blue-700 shadow-sm">
        <Sparkles size={15} />
        Original, licensed, or publicly permitted materials only
      </div>
    </div>
  );
}
