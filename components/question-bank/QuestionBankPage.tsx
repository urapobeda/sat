"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FolderOpen,
  Layers3,
  ListChecks,
  type LucideIcon,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  SquareRadical,
  XCircle
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
  type QuestionBankCategory,
  type QuestionProgressLookup
} from "@/lib/questionBankStructure";
import {
  getTopicSummaries,
  getUniqueTopicCount,
  normalizeTopic,
  type SectionFilter
} from "@/lib/questions";
import {
  getCurrentUser,
  getQuestionProgressLookup,
  getQuestions
} from "@/lib/supabase/queries";
import type { DifficultyFilter, Question, SatSection } from "@/types/sat";

type AnswerFilter = "all" | "incorrect" | "not-incorrect";
type CategoryFilter = "all" | string;

const EMPTY_PROGRESS: QuestionProgressLookup = {
  answeredIds: new Set<string>(),
  correctIds: new Set<string>(),
  incorrectIds: new Set<string>()
};

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
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [answerFilter, setAnswerFilter] = useState<AnswerFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<QuestionProgressLookup>(EMPTY_PROGRESS);
  const [hasAnswerHistory, setHasAnswerHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadQuestionBank() {
    setIsLoading(true);
    setError(false);

    try {
      const [loadedQuestions, user] = await Promise.all([
        getQuestions(),
        getCurrentUser().catch(() => null)
      ]);
      setQuestions(loadedQuestions);

      if (!user) {
        setProgress(EMPTY_PROGRESS);
        setHasAnswerHistory(false);
        return;
      }

      const loadedProgress = await getQuestionProgressLookup(user.id);
      setProgress(loadedProgress);
      setHasAnswerHistory(loadedProgress.answeredIds.size > 0);
    } catch (requestError) {
      console.error("Question Bank load failed", requestError);
      setError(true);
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

  const categoryOptions = useMemo(() => {
    const visibleSections = getVisibleSectionKeys(sectionFilter);

    return getUniqueCategories(questions)
      .filter((category) => visibleSections.includes(category.section))
      .map((category) => ({
        label: category.title,
        value: category.title
      }));
  }, [questions, sectionFilter]);
  const topicOptions = useMemo(() => {
    const topics = questions
      .filter((question) => {
        const matchesSection =
          sectionFilter === "all" || question.section === sectionFilter;
        const matchesCategory =
          categoryFilter === "all" || getQuestionCategory(question) === categoryFilter;

        return matchesSection && matchesCategory;
      })
      .map((question) => question.topic);

    return Array.from(new Set(topics)).sort((first, second) =>
      first.localeCompare(second)
    );
  }, [categoryFilter, questions, sectionFilter]);
  const filteredQuestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizedTopic =
      topicFilter === "all" ? "all" : normalizeTopic(topicFilter);

    return questions.filter((question) => {
      const category = getQuestionCategory(question);
      const matchesSection =
        sectionFilter === "all" || question.section === sectionFilter;
      const matchesCategory = categoryFilter === "all" || category === categoryFilter;
      const matchesTopic =
        normalizedTopic === "all" || normalizeTopic(question.topic) === normalizedTopic;
      const matchesDifficulty =
        difficultyFilter === "all" || question.difficulty === difficultyFilter;
      const matchesAnswerStatus =
        answerFilter === "all" ||
        (answerFilter === "incorrect"
          ? progress.incorrectIds.has(question.id)
          : !progress.incorrectIds.has(question.id));
      const matchesSearch =
        query.length === 0 ||
        question.question.toLowerCase().includes(query) ||
        question.topic.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query) ||
        question.explanation.toLowerCase().includes(query);

      return (
        matchesSection &&
        matchesCategory &&
        matchesTopic &&
        matchesDifficulty &&
        matchesAnswerStatus &&
        matchesSearch
      );
    });
  }, [
    answerFilter,
    categoryFilter,
    difficultyFilter,
    progress.incorrectIds,
    questions,
    searchQuery,
    sectionFilter,
    topicFilter
  ]);
  const topicSummaries = useMemo(
    () => getTopicSummaries(filteredQuestions),
    [filteredQuestions]
  );

  function updateSectionFilter(value: SectionFilter) {
    setSectionFilter(value);
    setCategoryFilter("all");
    setTopicFilter("all");
  }

  function updateCategoryFilter(value: string) {
    setCategoryFilter(value);
    setTopicFilter("all");
  }

  function resetFilters() {
    setSectionFilter("all");
    setCategoryFilter("all");
    setTopicFilter("all");
    setDifficultyFilter("all");
    setAnswerFilter("all");
    setSearchQuery("");
  }

  return (
    <Layout>
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-white p-6 shadow-soft sm:p-8">
        <HeaderIllustration />

        <div className="relative z-10">
          <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
            Question Bank
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Explore SAT-style questions by section, category, topic, difficulty,
            and answer history.
          </p>
        </div>

        <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
          <FilterSelect
            accent="bg-blue-50 text-blue-600"
            icon={SquareRadical}
            label="Section"
            onChange={(value) => updateSectionFilter(value as SectionFilter)}
            options={[
              { label: "All", value: "all" },
              { label: "Reading & Writing", value: "reading-writing" },
              { label: "Math", value: "math" }
            ]}
            value={sectionFilter}
          />

          <FilterSelect
            accent="bg-violet-50 text-violet-600"
            icon={Layers3}
            label="Category"
            onChange={updateCategoryFilter}
            options={[
              { label: "All Categories", value: "all" },
              ...categoryOptions
            ]}
            value={categoryFilter}
          />

          <FilterSelect
            accent="bg-cyan-50 text-cyan-600"
            icon={ListChecks}
            label="Topic"
            onChange={setTopicFilter}
            options={[
              { label: "All Topics", value: "all" },
              ...topicOptions.map((topic) => ({ label: topic, value: topic }))
            ]}
            value={topicFilter}
          />

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
            <QuestionBankError onRetry={() => void loadQuestionBank()} />
          ) : questions.length === 0 ? (
            <StatusCard
              description="No questions are available yet."
              title="No questions found"
            />
          ) : filteredQuestions.length === 0 ? (
            <StatusCard
              description={
                answerFilter === "incorrect" && !hasAnswerHistory
                  ? "Sign in and complete practice or tests to build your incorrect-answer list."
                  : "Try a different section, category, topic, difficulty, or search query."
              }
              title="No questions match these filters"
            />
          ) : (
            <div className="grid gap-5 2xl:grid-cols-2">
              {SECTIONS.filter(
                (section) =>
                  sectionFilter === "all" || sectionFilter === section.key
              ).map((section) => (
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
  const topics = Array.from(new Set(questions.map((question) => question.topic))).sort(
    (first, second) => first.localeCompare(second)
  );

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
          {topics.length > 0 ? (
            topics.map((topic) => (
              <TopicLinkRow
                category={category}
                key={topic}
                progress={progress}
                questions={questions.filter((question) => question.topic === topic)}
                topic={topic}
              />
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
              No questions in this category yet.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TopicLinkRow({
  category,
  progress,
  questions,
  topic
}: {
  category: QuestionBankCategory;
  progress: QuestionProgressLookup;
  questions: Question[];
  topic: string;
}) {
  const stats = getQuestionGroupStats(questions, progress);
  const mastery = getMastery(stats);
  const href = `/question-bank/practice?section=${category.section}&category=${encodeURIComponent(category.title)}&topic=${normalizeTopic(topic)}`;

  return (
    <Link
      className="group grid gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/60 sm:grid-cols-[1fr_auto] sm:items-center"
      href={href}
    >
      <div>
        <p className="font-black text-slate-950">{topic}</p>
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
      <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-blue-600 shadow-sm transition group-hover:border-blue-200 group-hover:bg-blue-600 group-hover:text-white">
        Practice
        <ArrowRight size={16} />
      </span>
    </Link>
  );
}

function StatsGrid({ stats }: { stats: ReturnType<typeof getQuestionGroupStats> }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
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
    <div className="grid gap-5 2xl:grid-cols-2">
      {[0, 1].map((section) => (
        <div
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          key={section}
        >
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map((item) => (
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

function QuestionBankError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-center shadow-sm">
      <Search className="mx-auto text-rose-600" size={30} />
      <h2 className="mt-3 text-xl font-black text-rose-900">
        Questions could not be loaded. Please try again.
      </h2>
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

function getVisibleSectionKeys(sectionFilter: SectionFilter): SatSection[] {
  if (sectionFilter === "all") {
    return ["reading-writing", "math"];
  }

  return [sectionFilter];
}

function getUniqueCategories(questions: Question[]) {
  const categories = new Map<string, QuestionBankCategory>();

  questions.forEach((question) => {
    const category = getCategoriesForSection(question.section).find(
      (item) => item.title === getQuestionCategory(question)
    );

    if (category) {
      categories.set(`${category.section}-${category.title}`, category);
    }
  });

  return Array.from(categories.values());
}
