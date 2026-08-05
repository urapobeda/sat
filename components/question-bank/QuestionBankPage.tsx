"use client";

import {
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  FileText,
  FolderOpen,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  SquareRadical,
  XCircle,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { ProgressSidebar } from "@/components/question-bank/ProgressSidebar";
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
import { getTopicSummaries, getUniqueTopicCount, normalizeTopic } from "@/lib/questions";
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

  const topicSummaries = useMemo(
    () => getTopicSummaries(filteredQuestions),
    [filteredQuestions]
  );

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
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-white p-6 shadow-soft sm:p-8">
        <HeaderIllustration />

        <div className="relative z-10">
          <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
            Question Bank
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Explore SAT-style questions by skill, difficulty, source type, and
            review history.
          </p>
        </div>

        <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <FilterSelect
            accent="bg-emerald-50 text-emerald-600"
            icon={CheckCircle2}
            label="Difficulty"
            onChange={(value) => setDifficultyFilter(value as DifficultyFilter)}
            options={[
              { label: "All Levels", value: "all" },
              { label: "Easy", value: "easy" },
              { label: "Medium", value: "medium" },
              { label: "Hard", value: "hard" }
            ]}
            value={difficultyFilter}
          />

          <FilterSelect
            accent="bg-orange-50 text-orange-600"
            icon={XCircle}
            label="Answered Incorrectly"
            onChange={(value) => setAnswerFilter(value as AnswerFilter)}
            options={[
              { label: "All", value: "all" },
              { label: "Yes", value: "incorrect" },
              { label: "No", value: "not-incorrect" }
            ]}
            value={answerFilter}
          />

          <FilterSelect
            accent="bg-violet-50 text-violet-600"
            icon={Bookmark}
            label="Marked for Review"
            onChange={(value) => setMarkedFilter(value as MarkedFilter)}
            options={[
              { label: "All", value: "all" },
              { label: "Marked", value: "marked" },
              { label: "Not Marked", value: "unmarked" }
            ]}
            value={markedFilter}
          />

          <FilterSelect
            accent="bg-blue-50 text-blue-600"
            icon={FileText}
            label="Bluebook"
            onChange={(value) => setBluebookFilter(value as BluebookFilter)}
            options={[
              { label: "All Questions", value: "all" },
              { label: "Bluebook Only", value: "bluebook-only" },
              { label: "Exclude Bluebook", value: "exclude-bluebook" }
            ]}
            value={bluebookFilter}
          />

          <button
            className="inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-blue-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-lg"
            onClick={resetFilters}
            type="button"
          >
            <SlidersHorizontal size={19} />
            Reset
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <SearchInput onChange={setSearchQuery} value={searchQuery} />
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
        </div>

        <ProgressSidebar
          questionsAnswered={progress.answeredIds.size}
          totalQuestions={questions.length}
          totalTopics={getUniqueTopicCount(filteredQuestions)}
          topicSummaries={topicSummaries}
        />
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

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-4">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${section.tone} text-white shadow-lg`}
        >
          <Icon size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-slate-950">{section.title}</h2>
            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-200">
              {stats.totalQuestions.toLocaleString()} Questions
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {section.description}
          </p>
        </div>
      </div>

      <StatsGrid stats={stats} />

      <div className="mt-5 space-y-3">
        {categories.map((category) => (
          <CategoryAccordion
            category={category}
            key={category.title}
            progress={progress}
            questions={questions.filter(
              (question) => getQuestionCategory(question) === category.title
            )}
          />
        ))}
      </div>
    </article>
  );
}

function CategoryAccordion({
  category,
  progress,
  questions
}: {
  category: QuestionBankCategory;
  progress: QuestionProgressLookup;
  questions: Question[];
}) {
  const [isOpen, setIsOpen] = useState(questions.length > 0);
  const stats = getQuestionGroupStats(questions, progress);
  const mastery = getMastery(stats);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
      <button
        className="flex w-full flex-col gap-4 p-4 text-left transition hover:bg-blue-50/60 sm:flex-row sm:items-center sm:justify-between"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-black text-slate-950">{category.title}</h3>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-200">
              {stats.totalQuestions.toLocaleString()} Questions
            </span>
            {mastery !== null ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                {mastery}% Mastery
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            {category.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
            <CountPill label="Answered" value={stats.answeredQuestions} />
            <CountPill label="Correct" tone="text-emerald-700" value={stats.correctQuestions} />
            <CountPill label="Incorrect" tone="text-rose-700" value={stats.incorrectQuestions} />
            <CountPill label="Remaining" value={stats.remainingQuestions} />
          </div>
        </div>

        <ChevronDown
          className={[
            "shrink-0 text-blue-600 transition",
            isOpen ? "rotate-180" : ""
          ].join(" ")}
          size={22}
        />
      </button>

      {isOpen ? (
        <div className="space-y-2 border-t border-slate-200 bg-white p-3">
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
      ) : null}
    </div>
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
  const href = `/question-bank/practice?section=${category.section}&category=${encodeURIComponent(category.title)}&topic=${normalizeTopic(subtopic.title)}`;
  const content = (
    <>
      <div>
        <p className="font-black text-slate-950">{subtopic.title}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
          <CountPill label="Questions" value={stats.totalQuestions} />
          <CountPill label="Answered" value={stats.answeredQuestions} />
          <CountPill label="Correct" tone="text-emerald-700" value={stats.correctQuestions} />
          <CountPill label="Incorrect" tone="text-rose-700" value={stats.incorrectQuestions} />
          {mastery !== null ? (
            <CountPill label="Mastery" tone="text-blue-700" value={`${mastery}%`} />
          ) : null}
        </div>
      </div>
      <span
        className={[
          "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-black shadow-sm transition",
          stats.totalQuestions > 0
            ? "border-slate-200 bg-white text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-600 group-hover:text-white"
            : "border-slate-100 bg-slate-50 text-slate-400"
        ].join(" ")}
      >
        {stats.totalQuestions > 0 ? "Practice" : "Empty"}
        {stats.totalQuestions > 0 ? <ArrowRight size={16} /> : null}
      </span>
    </>
  );

  if (stats.totalQuestions === 0) {
    return (
      <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
        {content}
      </div>
    );
  }

  return (
    <Link
      className="group grid gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/60 sm:grid-cols-[1fr_auto] sm:items-center"
      href={href}
    >
      {content}
    </Link>
  );
}

function StatsGrid({ stats }: { stats: ReturnType<typeof getQuestionGroupStats> }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5 xl:grid-cols-2 2xl:grid-cols-5">
      <StatTile label="Total" value={stats.totalQuestions} />
      <StatTile label="Answered" value={stats.answeredQuestions} />
      <StatTile label="Correct" tone="text-emerald-700" value={stats.correctQuestions} />
      <StatTile label="Incorrect" tone="text-rose-700" value={stats.incorrectQuestions} />
      <StatTile label="Remaining" value={stats.remainingQuestions} />
    </div>
  );
}

function StatTile({
  label,
  tone = "text-slate-950",
  value
}: {
  label: string;
  tone?: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center ring-1 ring-slate-100">
      <p className={`text-xl font-black ${tone}`}>{value.toLocaleString()}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function CountPill({
  label,
  tone = "text-slate-600",
  value
}: {
  label: string;
  tone?: string;
  value: number | string;
}) {
  return (
    <span className={`rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200 ${tone}`}>
      {label}: {typeof value === "number" ? value.toLocaleString() : value}
    </span>
  );
}

function FilterSelect({
  accent,
  icon: Icon,
  label,
  onChange,
  options,
  value
}: {
  accent: string;
  icon: LucideIcon;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid min-h-16 grid-cols-[auto_1fr] items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={21} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-black text-slate-500">{label}</span>
        <select
          className="mt-1 w-full truncate bg-transparent text-sm font-black text-slate-950 outline-none"
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

function HeaderIllustration() {
  return (
    <div className="pointer-events-none absolute right-[25%] top-4 hidden lg:block">
      <Sparkles className="absolute -left-10 top-8 text-blue-500" size={18} />
      <Sparkles className="absolute -right-8 top-4 text-emerald-400" size={18} />
      <Sparkles className="absolute right-8 -top-2 text-violet-500" size={18} />

      <div className="relative h-32 w-44">
        <div className="absolute left-8 top-2 h-24 w-24 rotate-6 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-xl shadow-blue-700/20" />
        <div className="absolute left-0 top-8 h-20 w-32 rounded-2xl bg-gradient-to-br from-violet-300 to-blue-400 shadow-lg">
          <FolderOpen className="absolute left-8 top-5 text-white" size={42} />
        </div>
        <div className="absolute bottom-0 right-0 h-16 w-16 rounded-full border-8 border-blue-400 bg-white shadow-lg" />
        <div className="absolute bottom-0 right-0 h-10 w-3 translate-x-3 translate-y-3 rotate-[-45deg] rounded-full bg-blue-600" />
      </div>
    </div>
  );
}

