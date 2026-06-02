"use client";

import {
  BookOpen,
  Filter,
  FolderOpen,
  Grid2X2,
  Layers3,
  ListChecks,
  Search,
  SlidersHorizontal,
  Sparkles,
  SquareRadical
} from "lucide-react";
import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { FilterCard } from "@/components/question-bank/FilterCard";
import { ProgressSidebar } from "@/components/question-bank/ProgressSidebar";
import { SearchInput } from "@/components/question-bank/SearchInput";
import { SectionSummaryCard } from "@/components/question-bank/SectionSummaryCard";
import { SectionTabs } from "@/components/question-bank/SectionTabs";
import { TopicRow } from "@/components/question-bank/TopicRow";
import { questions } from "@/data/questions";
import {
  getSectionCount,
  getTopicSummaries,
  getUniqueTopicCount,
  type SectionFilter
} from "@/lib/questions";

const filterCards = [
  {
    label: "Section",
    value: "All Sections",
    icon: SquareRadical,
    accent: "bg-blue-50 text-blue-600"
  },
  {
    label: "Question Type",
    value: "All Types",
    icon: ListChecks,
    accent: "bg-blue-50 text-blue-600"
  },
  {
    label: "Difficulty",
    value: "All Levels",
    icon: Layers3,
    accent: "bg-emerald-50 text-emerald-600"
  },
  {
    label: "Status",
    value: "All Status",
    icon: Filter,
    accent: "bg-violet-50 text-violet-600"
  }
];

export function QuestionBankPage() {
  const [activeTab, setActiveTab] = useState<SectionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const topicSummaries = useMemo(() => getTopicSummaries(questions), []);
  const sectionTabs = useMemo(
    () => [
      {
        icon: Grid2X2,
        key: "all" as const,
        label: "All Sections",
        questions: `${getSectionCount(questions, "all").toLocaleString()} Questions`
      },
      {
        icon: SquareRadical,
        key: "math" as const,
        label: "Math",
        questions: `${getSectionCount(questions, "math").toLocaleString()} Questions`
      },
      {
        icon: BookOpen,
        key: "reading-writing" as const,
        label: "Reading & Writing",
        questions: `${getSectionCount(questions, "reading-writing").toLocaleString()} Questions`
      }
    ],
    []
  );

  const visibleTopics = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return topicSummaries.filter((topic) => {
      const matchesTab = activeTab === "all" || topic.section === activeTab;
      const relatedQuestions = questions.filter(
        (question) => question.topic === topic.title
      );
      const matchesSearch =
        query.length === 0 ||
        topic.title.toLowerCase().includes(query) ||
        topic.description.toLowerCase().includes(query) ||
        relatedQuestions.some((question) =>
          question.question.toLowerCase().includes(query)
        );

      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery, topicSummaries]);

  const visibleSummaries = getSectionSummaries(topicSummaries).filter(
    (summary) => activeTab === "all" || summary.section === activeTab
  );

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

        <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          {filterCards.map((filterCard) => (
            <FilterCard key={filterCard.label} {...filterCard} />
          ))}

          <button
            className="inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-blue-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-lg"
            type="button"
          >
            <SlidersHorizontal size={19} />
            Filters
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <SectionTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={sectionTabs}
          />

          <div className="space-y-4 p-4 sm:p-6">
            {visibleSummaries.map((summary) => (
              <SectionSummaryCard key={summary.title} {...summary} />
            ))}

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
                {visibleTopics.length > 0 ? (
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
          questionsAnswered={Math.round(questions.length * 0.61)}
          totalQuestions={questions.length}
          totalTopics={getUniqueTopicCount(questions)}
          topicSummaries={topicSummaries}
        />
      </section>
    </Layout>
  );
}

function getSectionSummaries(topicSummaries: ReturnType<typeof getTopicSummaries>) {
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
