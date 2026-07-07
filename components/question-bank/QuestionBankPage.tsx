"use client";

import {
  BookOpen,
  FolderOpen,
  Grid2X2,
  Layers3,
  ListChecks,
  type LucideIcon,
  Search,
  SlidersHorizontal,
  Sparkles,
  SquareRadical
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { ProgressSidebar } from "@/components/question-bank/ProgressSidebar";
import { SearchInput } from "@/components/question-bank/SearchInput";
import { SectionSummaryCard } from "@/components/question-bank/SectionSummaryCard";
import { SectionTabs } from "@/components/question-bank/SectionTabs";
import { TopicRow } from "@/components/question-bank/TopicRow";
import {
  getSectionCount,
  getTopicSummaries,
  getUniqueTopicCount,
  normalizeTopic,
  type SectionFilter
} from "@/lib/questions";
import { getQuestions } from "@/lib/supabase/queries";
import type { DifficultyFilter, Question } from "@/types/sat";

export function QuestionBankPage() {
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [questionBankQuestions, setQuestionBankQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const topicOptions = useMemo(() => {
    const topics = questionBankQuestions
      .filter(
        (question) => sectionFilter === "all" || question.section === sectionFilter
      )
      .map((question) => question.topic);

    return Array.from(new Set(topics)).sort((a, b) => a.localeCompare(b));
  }, [questionBankQuestions, sectionFilter]);
  const filteredQuestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizedTopic =
      topicFilter === "all" ? "all" : normalizeTopic(topicFilter);

    return questionBankQuestions.filter((question) => {
      const matchesSection =
        sectionFilter === "all" || question.section === sectionFilter;
      const matchesDifficulty =
        difficultyFilter === "all" || question.difficulty === difficultyFilter;
      const matchesTopic =
        normalizedTopic === "all" || normalizeTopic(question.topic) === normalizedTopic;
      const matchesSearch =
        query.length === 0 ||
        question.question.toLowerCase().includes(query) ||
        question.topic.toLowerCase().includes(query) ||
        question.explanation.toLowerCase().includes(query);

      return matchesSection && matchesDifficulty && matchesTopic && matchesSearch;
    });
  }, [difficultyFilter, questionBankQuestions, searchQuery, sectionFilter, topicFilter]);
  const topicSummaries = useMemo(
    () => getTopicSummaries(filteredQuestions),
    [filteredQuestions]
  );
  const sectionTabs = useMemo(
    () => [
      {
        icon: Grid2X2,
        key: "all" as const,
        label: "All Sections",
        questions: `${getSectionCount(questionBankQuestions, "all").toLocaleString()} Questions`
      },
      {
        icon: SquareRadical,
        key: "math" as const,
        label: "Math",
        questions: `${getSectionCount(questionBankQuestions, "math").toLocaleString()} Questions`
      },
      {
        icon: BookOpen,
        key: "reading-writing" as const,
        label: "Reading & Writing",
        questions: `${getSectionCount(questionBankQuestions, "reading-writing").toLocaleString()} Questions`
      }
    ],
    [questionBankQuestions]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadQuestions() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getQuestions();
        console.info(`[Supabase] Loaded ${data.length} questions for Question Bank.`);

        if (isMounted) {
          setQuestionBankQuestions(data);
        }
      } catch (requestError) {
        console.error("[Supabase] Question Bank load failed:", requestError);
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load questions from Supabase."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadQuestions();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleTopics = topicSummaries;

  const visibleSummaries = getSectionSummaries(
    topicSummaries,
    filteredQuestions
  ).filter((summary) => sectionFilter === "all" || summary.section === sectionFilter);

  function updateSectionFilter(value: SectionFilter) {
    setSectionFilter(value);
    setTopicFilter("all");
  }

  return (
    <Layout>
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-white p-6 shadow-soft sm:p-8">
        <HeaderIllustration />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              Question Bank
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              Explore thousands of SAT-style questions by section and topic.
              Filter, practice, and master every concept.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
          <FilterSelect
            accent="bg-blue-50 text-blue-600"
            icon={SquareRadical}
            label="Section"
            onChange={(value) => updateSectionFilter(value as SectionFilter)}
            options={[
              { label: "All Sections", value: "all" },
              { label: "Math", value: "math" },
              { label: "Reading & Writing", value: "reading-writing" }
            ]}
            value={sectionFilter}
          />

          <FilterSelect
            accent="bg-violet-50 text-violet-600"
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
            icon={Layers3}
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

          <button
            className="inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-blue-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-lg"
            onClick={() => {
              updateSectionFilter("all");
              setTopicFilter("all");
              setDifficultyFilter("all");
              setSearchQuery("");
            }}
            type="button"
          >
            <SlidersHorizontal size={19} />
            Reset
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <SectionTabs
            activeTab={sectionFilter}
            onChange={updateSectionFilter}
            tabs={sectionTabs}
          />

          <div className="space-y-4 p-4 sm:p-6">
            {isLoading ? (
              <LoadingRows />
            ) : error ? (
              <SupabaseErrorCard error={error} />
            ) : questionBankQuestions.length === 0 ? (
              <StatusCard
                description="Run supabase/seed.sql in your Supabase SQL editor to add the SAT question set."
                title="No questions found"
              />
            ) : filteredQuestions.length === 0 ? (
              <StatusCard
                description="Try a different section, topic, difficulty, or search query."
                title="No questions match these filters"
              />
            ) : (
              visibleSummaries.map((summary) => (
                <SectionSummaryCard key={summary.title} {...summary} />
              ))
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-xl font-black text-slate-950">All Topics</h2>
                <div className="w-full lg:max-w-sm">
                  <SearchInput onChange={setSearchQuery} value={searchQuery} />
                </div>
              </div>

              <div className="mt-5 hidden grid-cols-[1.5fr_0.55fr_0.45fr_0.75fr_auto] border-b border-slate-200 px-4 pb-3 text-xs font-black uppercase tracking-[0.1em] text-slate-500 md:grid">
                <span>Topic</span>
                <span>Section</span>
                <span>Questions</span>
                <span>Mastery</span>
                <span className="text-right">Action</span>
              </div>

              <div className="mt-1">
                {isLoading ? (
                  <LoadingRows compact />
                ) : error ? (
                  <div className="rounded-2xl bg-rose-50 p-8 text-center">
                    <p className="font-black text-rose-700">{error}</p>
                    <p className="mt-2 text-sm text-rose-600">
                      Supabase questions are readable for guests after the public
                      anon key is configured.
                    </p>
                  </div>
                ) : visibleTopics.length > 0 ? (
                  visibleTopics.map((topic) => (
                    <TopicRow key={topic.title} topic={topic} />
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-8 text-center">
                    <Search className="mx-auto text-slate-400" size={30} />
                    <p className="mt-3 font-black text-slate-950">
                      No topics found
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Try a different search query or section tab.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <ProgressSidebar
          questionsAnswered={filteredQuestions.length}
          totalQuestions={questionBankQuestions.length}
          totalTopics={getUniqueTopicCount(filteredQuestions)}
          topicSummaries={topicSummaries}
        />
      </section>
    </Layout>
  );
}

function SupabaseErrorCard({ error }: { error: string }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
      <p className="font-black text-rose-800">Supabase could not load questions</p>
      <p className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-sm font-bold text-rose-700">
        {error}
      </p>
      <p className="mt-3 text-sm leading-6 text-rose-700">
        Check `.env.local`, confirm the anon key is public, and make sure the
        `questions` RLS policy allows `SELECT` for `anon` and `authenticated`.
      </p>
    </div>
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

function getSectionSummaries(
  topicSummaries: ReturnType<typeof getTopicSummaries>,
  questions: Question[]
) {
  const summaries = [
    {
      title: "Math",
      description: "Algebra, Advanced Math, Problem Solving and Data Analysis",
      section: "math" as const,
      icon: SquareRadical,
      questions: `${getSectionCount(questions, "math").toLocaleString()} Questions`,
      topics: `${getUniqueTopicCount(questions, "math")} Topics`,
      mastery: getAverageMastery(topicSummaries, "math"),
      tone: "from-blue-500 to-blue-700"
    },
    {
      title: "Reading & Writing",
      description: "Reading Comprehension, Grammar and Vocabulary",
      section: "reading-writing" as const,
      icon: BookOpen,
      questions: `${getSectionCount(questions, "reading-writing").toLocaleString()} Questions`,
      topics: `${getUniqueTopicCount(questions, "reading-writing")} Topics`,
      mastery: getAverageMastery(topicSummaries, "reading-writing"),
      tone: "from-violet-500 to-purple-700"
    }
  ];

  return summaries;
}

function LoadingRows({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-4">
      {[0, 1].map((item) => (
        <div
          className={[
            "animate-pulse rounded-2xl border border-slate-100 bg-slate-50",
            compact ? "h-20" : "h-32"
          ].join(" ")}
          key={item}
        />
      ))}
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
    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
      <p className="font-black text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function getAverageMastery(
  topicSummaries: ReturnType<typeof getTopicSummaries>,
  section: "math" | "reading-writing"
) {
  const sectionTopics = topicSummaries.filter((topic) => topic.section === section);

  if (sectionTopics.length === 0) {
    return 0;
  }

  return Math.round(
    sectionTopics.reduce((sum, topic) => sum + topic.mastery, 0) /
      sectionTopics.length
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
