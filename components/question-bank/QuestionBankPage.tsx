"use client";

import {
  ArrowRight,
  BookOpen,
  Bookmark,
  FileText,
  RotateCcw,
  Search,
  SlidersHorizontal,
  SquareRadical,
  XCircle,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { SearchInput } from "@/components/question-bank/SearchInput";
import {
  getCategoriesForSection,
  getMastery,
  getQuestionCategory,
  getQuestionGroupStats,
  getQuestionSubtopic,
  questionMatchesSubtopic,
  type QuestionBankCategory,
  type QuestionBankSubtopic,
  type QuestionProgressLookup
} from "@/lib/questionBankStructure";
import { normalizeTopic } from "@/lib/questions";
import {
  getCurrentUser,
  getMarkedQuestionIds,
  getQuestionProgressLookup,
  getQuestions
} from "@/lib/supabase/queries";
import type { DifficultyFilter, Question } from "@/types/sat";

type AnswerFilter = "all" | "incorrect" | "not-incorrect";
type BluebookFilter = "all" | "bluebook-only" | "exclude-bluebook";
type MarkedFilter = "all" | "marked" | "unmarked";

const EMPTY_PROGRESS: QuestionProgressLookup = {
  answeredIds: new Set<string>(),
  correctIds: new Set<string>(),
  incorrectIds: new Set<string>()
};

const EMPTY_MARKS = new Set<string>();

const SECTIONS = [
  {
    description: "Craft, evidence, grammar, transitions, and expression skills",
    icon: BookOpen,
    key: "reading-writing" as const,
    title: "Reading & Writing",
    tone: "from-violet-500 to-purple-700"
  },
  {
    description: "Algebra, advanced math, data analysis, geometry, and trig",
    icon: SquareRadical,
    key: "math" as const,
    title: "Math",
    tone: "from-blue-500 to-blue-700"
  }
];

export function QuestionBankPage() {
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [answerFilter, setAnswerFilter] = useState<AnswerFilter>("all");
  const [markedFilter, setMarkedFilter] = useState<MarkedFilter>("all");
  const [bluebookFilter, setBluebookFilter] = useState<BluebookFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<QuestionProgressLookup>(EMPTY_PROGRESS);
  const [markedQuestionIds, setMarkedQuestionIds] = useState<Set<string>>(EMPTY_MARKS);
  const [hasAnswerHistory, setHasAnswerHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadQuestionBank() {
    setIsLoading(true);
    setError(null);

    try {
      const [loadedQuestions, user] = await Promise.all([
        getQuestions(),
        getCurrentUser().catch(() => null)
      ]);
      setQuestions(loadedQuestions);

      if (!user) {
        setProgress(EMPTY_PROGRESS);
        setMarkedQuestionIds(EMPTY_MARKS);
        setHasAnswerHistory(false);
        return;
      }

      const [loadedProgress, loadedMarkedQuestionIds] = await Promise.all([
        getQuestionProgressLookup(user.id),
        getMarkedQuestionIds(user.id).catch(() => new Set<string>())
      ]);

      setProgress(loadedProgress);
      setMarkedQuestionIds(loadedMarkedQuestionIds);
      setHasAnswerHistory(loadedProgress.answeredIds.size > 0);
    } catch (requestError) {
      console.error("Question Bank load failed", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Questions could not be loaded."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadQuestionBank();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const filteredQuestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return questions.filter((question) => {
      const category = getQuestionCategory(question);
      const subtopic = getQuestionSubtopic(question);
      const isMarked = markedQuestionIds.has(question.id);
      const matchesDifficulty =
        difficultyFilter === "all" || question.difficulty === difficultyFilter;
      const matchesAnswerStatus =
        answerFilter === "all" ||
        (answerFilter === "incorrect"
          ? progress.incorrectIds.has(question.id)
          : !progress.incorrectIds.has(question.id));
      const matchesMarked =
        markedFilter === "all" ||
        (markedFilter === "marked" ? isMarked : !isMarked);
      const matchesBluebook =
        bluebookFilter === "all" ||
        (bluebookFilter === "bluebook-only"
          ? question.isBluebook
          : !question.isBluebook);
      const matchesSearch =
        query.length === 0 ||
        question.question.toLowerCase().includes(query) ||
        question.topic.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query) ||
        subtopic.toLowerCase().includes(query);

      return (
        matchesDifficulty &&
        matchesAnswerStatus &&
        matchesMarked &&
        matchesBluebook &&
        matchesSearch
      );
    });
  }, [
    answerFilter,
    bluebookFilter,
    difficultyFilter,
    markedFilter,
    markedQuestionIds,
    progress.incorrectIds,
    questions,
    searchQuery
  ]);

  const filterEmptyDescription = useMemo(() => {
    if (answerFilter === "incorrect" && !hasAnswerHistory) {
      return "Sign in and complete practice or tests to build your incorrect-answer list.";
    }

    if (markedFilter === "marked" && markedQuestionIds.size === 0) {
      return "Marked questions will appear here after you save questions for review.";
    }

    return "Try a different difficulty, review status, Bluebook setting, or search query.";
  }, [answerFilter, hasAnswerHistory, markedFilter, markedQuestionIds.size]);

  function resetFilters() {
    setDifficultyFilter("all");
    setAnswerFilter("all");
    setMarkedFilter("all");
    setBluebookFilter("all");
    setSearchQuery("");
  }

  return (
    <Layout align="left">
      <section className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-red-600">
                <BookOpen size={24} />
              </span>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Question Bank
              </h1>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Explore SAT-style questions by section, topic, difficulty, source,
              and review history.
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <DifficultyTabs
              onChange={setDifficultyFilter}
              value={difficultyFilter}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <CompactFilterSelect
                icon={XCircle}
                label="Incorrect"
                onChange={(value) => setAnswerFilter(value as AnswerFilter)}
                options={[
                  { label: "All", value: "all" },
                  { label: "Yes", value: "incorrect" },
                  { label: "No", value: "not-incorrect" }
                ]}
                value={answerFilter}
              />
              <CompactFilterSelect
                icon={FileText}
                label="Bluebook"
                onChange={(value) => setBluebookFilter(value as BluebookFilter)}
                options={[
                  { label: "All", value: "all" },
                  { label: "Only", value: "bluebook-only" },
                  { label: "Exclude", value: "exclude-bluebook" }
                ]}
                value={bluebookFilter}
              />
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                onClick={resetFilters}
                type="button"
              >
                <SlidersHorizontal size={15} />
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
          <SearchInput onChange={setSearchQuery} value={searchQuery} />
          <MarkedTabs onChange={setMarkedFilter} value={markedFilter} />
        </div>

          {isLoading ? (
            <QuestionBankSkeleton />
          ) : error ? (
            <QuestionBankError
              message={error}
              onRetry={() => void loadQuestionBank()}
            />
          ) : questions.length === 0 ? (
            <StatusCard
              description="Questions will appear here after they are added to Supabase."
              title="No questions found"
            />
          ) : (
            <>
              {filteredQuestions.length === 0 ? (
                <StatusCard
                  description={filterEmptyDescription}
                  title="No questions match these filters"
                />
              ) : null}

              <div className="grid gap-5 xl:grid-cols-2">
                {SECTIONS.map((section) => (
                  <QuestionBankSection
                    key={section.key}
                    progress={progress}
                    questions={filteredQuestions.filter(
                      (question) => question.section === section.key
                    )}
                    section={section}
                  />
                ))}
              </div>
            </>
          )}
      </section>
    </Layout>
  );
}

function QuestionBankSection({
  progress,
  questions,
  section
}: {
  progress: QuestionProgressLookup;
  questions: Question[];
  section: (typeof SECTIONS)[number];
}) {
  const Icon = section.icon;
  const stats = getQuestionGroupStats(questions, progress);
  const categories = getCategoriesForSection(section.key);
  const startHref = `/question-bank/practice?section=${section.key}`;

  return (
    <div className="space-y-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${section.tone} text-white shadow-lg sm:flex`}
            >
              <Icon size={22} />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-slate-950">{section.title}</h2>
              <p className="mt-0.5 text-sm font-medium text-slate-500">
                {stats.totalQuestions.toLocaleString()} questions
              </p>
            </div>
          </div>
          <Link
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-black text-white shadow-lg shadow-red-600/20 transition hover:-translate-y-0.5 hover:bg-red-700"
            href={startHref}
          >
            <ArrowRight size={15} />
            Start
          </Link>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <ProgressMeter percent={stats.totalQuestions > 0 ? Math.round((stats.answeredQuestions / stats.totalQuestions) * 100) : 0} />
          <span className="whitespace-nowrap text-xs font-bold text-slate-600">
            {stats.answeredQuestions.toLocaleString()}/{stats.totalQuestions.toLocaleString()}
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
            Attempted
          </span>
        </div>
      </article>

      <div className="space-y-3">
        {categories.map((category) => (
          <CategoryCard
            category={category}
            key={category.title}
            progress={progress}
            questions={questions.filter(
              (question) => getQuestionCategory(question) === category.title
            )}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  progress,
  questions
}: {
  category: QuestionBankCategory;
  progress: QuestionProgressLookup;
  questions: Question[];
}) {
  const stats = getQuestionGroupStats(questions, progress);
  const percent =
    stats.totalQuestions > 0
      ? Math.round((stats.answeredQuestions / stats.totalQuestions) * 100)
      : 0;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-100 hover:shadow-md">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <h3 className="font-black text-slate-950">{category.title}</h3>
          <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500">
            {category.description}
          </p>
        </div>
        <QuestionCount
          answered={stats.answeredQuestions}
          percent={percent}
          total={stats.totalQuestions}
        />
      </div>

      <div className="mt-4 space-y-1 border-l border-slate-200 pl-4">
        {category.subtopics.map((subtopic) => (
          <SubtopicLinkRow
            category={category}
            key={subtopic.title}
            progress={progress}
            questions={questions.filter((question) =>
              questionMatchesSubtopic(question, subtopic.title)
            )}
            subtopic={subtopic}
          />
        ))}
      </div>
    </article>
  );
}

function SubtopicLinkRow({
  category,
  progress,
  questions,
  subtopic
}: {
  category: QuestionBankCategory;
  progress: QuestionProgressLookup;
  questions: Question[];
  subtopic: QuestionBankSubtopic;
}) {
  const stats = getQuestionGroupStats(questions, progress);
  const mastery = getMastery(stats);
  const percent =
    stats.totalQuestions > 0
      ? Math.round((stats.answeredQuestions / stats.totalQuestions) * 100)
      : 0;
  const href = `/question-bank/practice?section=${category.section}&category=${encodeURIComponent(category.title)}&topic=${normalizeTopic(subtopic.title)}`;
  const content = (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-700 transition group-hover:text-blue-700">
          {subtopic.title}
        </p>
        {mastery !== null ? (
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.08em] text-blue-600">
            {mastery}% mastery
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-3">
        <QuestionCount
          answered={stats.answeredQuestions}
          percent={percent}
          total={stats.totalQuestions}
        />
        <div
          className={[
            "hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition sm:flex",
            stats.totalQuestions > 0
              ? "border-slate-200 bg-white text-blue-600 group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white"
              : "border-slate-100 bg-slate-50 text-slate-300"
          ].join(" ")}
        >
          <ArrowRight size={14} />
        </div>
      </div>
    </>
  );

  if (stats.totalQuestions === 0) {
    return (
      <div className="grid min-h-10 gap-3 rounded-xl px-3 py-2 opacity-60 sm:grid-cols-[1fr_auto] sm:items-center">
        {content}
      </div>
    );
  }

  return (
    <Link
      className="group grid min-h-10 gap-3 rounded-xl px-3 py-2 transition hover:bg-blue-50/70 sm:grid-cols-[1fr_auto] sm:items-center"
      href={href}
    >
      {content}
    </Link>
  );
}

function QuestionCount({
  answered,
  percent,
  total
}: {
  answered: number;
  percent: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <ProgressMeter percent={percent} />
      <span className="min-w-14 text-right text-xs font-medium text-slate-600">
        {answered.toLocaleString()}/{total.toLocaleString()}
      </span>
    </div>
  );
}

function ProgressMeter({ percent }: { percent: number }) {
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <span className="h-1.5 w-28 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
      <span
        className="block h-full rounded-full bg-red-600 transition-all"
        style={{ width: `${clampedPercent}%` }}
      />
    </span>
  );
}

function DifficultyTabs({
  onChange,
  value
}: {
  onChange: (value: DifficultyFilter) => void;
  value: DifficultyFilter;
}) {
  const items: Array<{ label: string; value: DifficultyFilter }> = [
    { label: "All", value: "all" },
    { label: "Easy", value: "easy" },
    { label: "Medium", value: "medium" },
    { label: "Hard", value: "hard" }
  ];

  return (
    <div className="flex w-full flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm xl:w-auto">
      {items.map((item) => {
        const isActive = item.value === value;

        return (
          <button
            className={[
              "inline-flex min-h-9 items-center justify-center rounded-lg px-4 text-xs font-black transition",
              isActive
                ? "bg-red-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            ].join(" ")}
            key={item.value}
            onClick={() => onChange(item.value)}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function MarkedTabs({
  onChange,
  value
}: {
  onChange: (value: MarkedFilter) => void;
  value: MarkedFilter;
}) {
  const items: Array<{ label: string; value: MarkedFilter }> = [
    { label: "All", value: "all" },
    { label: "Marked", value: "marked" },
    { label: "Not Marked", value: "unmarked" }
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
      <Bookmark size={15} className="ml-2 text-slate-500" />
      {items.map((item) => {
        const isActive = item.value === value;

        return (
          <button
            className={[
              "inline-flex min-h-9 items-center justify-center rounded-lg px-3 text-xs font-black transition",
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-slate-950"
            ].join(" ")}
            key={item.value}
            onClick={() => onChange(item.value)}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function CompactFilterSelect({
  icon: Icon,
  label,
  onChange,
  options,
  value
}: {
  icon: LucideIcon;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid min-h-10 grid-cols-[auto_1fr] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/50">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-blue-600">
        <Icon size={15} />
      </span>
      <span className="min-w-0">
        <span className="sr-only">{label}</span>
        <select
          aria-label={label}
          className="w-full truncate bg-transparent outline-none"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function QuestionBankSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {[0, 1].map((section) => (
        <div
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          key={section}
        >
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((item) => (
              <div className="h-16 animate-pulse rounded-2xl bg-slate-100" key={item} />
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {[0, 1, 2, 3].map((item) => (
              <div className="h-24 animate-pulse rounded-2xl bg-slate-100" key={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionBankError({
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
        Questions could not be loaded. Please try again.
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-rose-700">
        {message}
      </p>
      <p className="mx-auto mt-3 max-w-xl text-xs font-bold leading-5 text-rose-600">
        If this mentions permissions or missing columns, run
        supabase/repair-question-bank-access.sql in Supabase SQL Editor.
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

function StatusCard({
  description,
  title
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-6 shadow-sm">
      <p className="font-black text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}


