"use client";

import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { ReadingQuestionFilters } from "@/components/question-bank/ReadingQuestionFilters";
import { DifficultyTabs } from "@/components/question-bank/DifficultyTabs";
import { ProgressMeter } from "@/components/question-bank/ProgressMeter";
import {
  getCategoriesForSection,
  getMastery,
  getQuestionGroupStats,
  questionMatchesSubtopic,
  type QuestionProgressLookup
} from "@/lib/questionBankStructure";
import { normalizeTopic } from "@/lib/questions";
import { filterQuestionCatalog, filterQuestionsByCompletion, QUESTION_DIFFICULTIES, type QuestionCompletion } from "@/lib/questionBankFilters";
import {
  getCurrentUser,
  getQuestionProgressLookup,
  getQuestionCatalog,
  getQuestionDetails,
  primeQuestionCatalog
} from "@/lib/supabase/queries";
import type { QuestionDifficulty, QuestionSummary } from "@/types/sat";

const SECTION_TITLES: Record<"math" | "reading-writing", string> = {
  math: "Math",
  "reading-writing": "Reading & Writing"
};

const EMPTY_PROGRESS: QuestionProgressLookup = {
  answeredIds: new Set<string>(),
  correctIds: new Set<string>(),
  incorrectIds: new Set<string>()
};

export function SectionPracticeSetupPage({ section, initialCatalog = null }: { section: string; initialCatalog?: QuestionSummary[] | null }) {
  const router = useRouter();
  const sectionKey = section === "math" ? "math" : "reading-writing";
  const sectionTitle = SECTION_TITLES[sectionKey];

  const [difficultyFilter, setDifficultyFilter] = useState<QuestionDifficulty[]>([...QUESTION_DIFFICULTIES]);
  const [completion, setCompletion] = useState<QuestionCompletion>("all");
  const [isProgressReady, setIsProgressReady] = useState(false);
  const [questions, setQuestions] = useState<QuestionSummary[]>(() => (initialCatalog ?? []).filter((q) => q.section === sectionKey));
  const [progress, setProgress] = useState<QuestionProgressLookup>(EMPTY_PROGRESS);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(initialCatalog === null);
  const [progressError, setProgressError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(initialCatalog === null);
      setError(null);
      setProgressError(false);
      setIsProgressReady(false);

      try {
        const userRequest = getCurrentUser().catch(() => null);
        if (initialCatalog) primeQuestionCatalog(initialCatalog);
        const loadedQuestions = (await getQuestionCatalog()).filter((q) => q.section === sectionKey);

        if (!isMounted) {
          return;
        }

        setQuestions(loadedQuestions);
        setIsLoading(false);
        const user = await userRequest;
        if (!isMounted) return;

        const loadedProgress = user
          ? await getQuestionProgressLookup(user.id).catch(() => {
            if (isMounted) setProgressError(true);
            return null;
          })
          : EMPTY_PROGRESS;

        if (isMounted && loadedProgress) {
          setProgress(loadedProgress);
          setIsProgressReady(true);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Questions could not be loaded."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [sectionKey, initialCatalog]);

  const filteredQuestions = useMemo(() => {
    if (completion !== "all" && !isProgressReady) return [];
    const matchingQuestions = filterQuestionCatalog(questions, { section: sectionKey, difficulties: difficultyFilter });
    return filterQuestionsByCompletion(matchingQuestions, completion, progress.answeredIds);
  }, [questions, difficultyFilter, sectionKey, completion, isProgressReady, progress]);

  const categories = getCategoriesForSection(sectionKey);
  const selectedCount = selectedTopics.size;

  const selectedQuestions = useMemo(() => {
    if (selectedCount === 0) {
      return filteredQuestions;
    }

    return filteredQuestions.filter((question) =>
      Array.from(selectedTopics).some((topicTitle) =>
        questionMatchesSubtopic(question, topicTitle)
      )
    );
  }, [filteredQuestions, selectedCount, selectedTopics]);
  const selectedStats = getQuestionGroupStats(selectedQuestions, progress);

  function toggleTopic(topicTitle: string) {
    setSelectedTopics((current) => {
      const next = new Set(current);

      if (next.has(topicTitle)) {
        next.delete(topicTitle);
      } else {
        next.add(topicTitle);
      }

      return next;
    });
  }

  const practiceHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("section", sectionKey);

    if (difficultyFilter.length === 1) {
      params.set("difficulty", difficultyFilter[0]);
    } else if (difficultyFilter.length < QUESTION_DIFFICULTIES.length) {
      params.set("difficulties", difficultyFilter.join(","));
    }

    if (completion !== "all") params.set("completion", completion);

    if (selectedCount > 0) {
      params.set(
        "topics",
        Array.from(selectedTopics)
          .map((topicTitle) => normalizeTopic(topicTitle))
          .join(",")
      );
    }

    return `/question-bank/practice?${params.toString()}`;
  }, [sectionKey, difficultyFilter, completion, selectedCount, selectedTopics]);

  useEffect(() => {
    if (isLoading || !selectedQuestions.length) return;
    const timer = window.setTimeout(() => {
      router.prefetch(practiceHref);
      void getQuestionDetails([selectedQuestions[0].id]).catch(() => {
        // Practice retries through its normal loader if speculative loading fails.
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [isLoading, selectedQuestions, practiceHref, router]);

  function startPractice() {
    router.push(practiceHref);
  }

  return (
    <StudentShell active="question-bank">
      <section className="mx-auto w-full max-w-5xl space-y-5">
        <div>
          <Link
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-blue-600"
            href="/question-bank"
          >
            <ArrowLeft size={15} />
            Question Bank
          </Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {sectionTitle}
          </h1>
        </div>

        {sectionKey === "reading-writing" ? (
          <ReadingQuestionFilters
            completion={completion}
            difficulties={difficultyFilter}
            onCompletionChange={setCompletion}
            onDifficultyChange={setDifficultyFilter}
            isProgressReady={isProgressReady}
          />
        ) : (
          <DifficultyTabs onChange={setDifficultyFilter} value={difficultyFilter} />
        )}

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-bold text-slate-950">
              {selectedCount > 0
                ? `Practice ${selectedCount} selected topic${selectedCount > 1 ? "s" : ""}`
                : "Practice all topics"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {sectionKey === "reading-writing"
                ? `${selectedStats.totalQuestions.toLocaleString("en-US")} questions match your selection.`
                : selectedCount > 0
                  ? `${selectedStats.totalQuestions.toLocaleString("en-US")} questions in the selected topics.`
                  : `Start practicing all ${categories.length} skills in ${sectionTitle}.`}
            </p>
          </div>
          <button
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold !text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
            disabled={selectedStats.totalQuestions === 0}
            onClick={startPractice}
            type="button"
          >
            Start practice
          </button>
        </div>

        {progressError ? (
          <p className="text-sm text-amber-700" role="status">Completion status is temporarily unavailable. You can still start practice.</p>
        ) : null}

        {isLoading ? (
          <SetupSkeleton />
        ) : error ? (
          <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-center shadow-sm">
            <Search className="mx-auto text-rose-600" size={28} />
            <p className="mt-3 text-sm font-bold text-rose-900">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <div
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                key={category.title}
              >
                <h2 className="text-base font-bold text-slate-950">
                  {category.title}
                </h2>

                <div className="mt-3 space-y-1">
                  {category.subtopics.map((subtopic) => {
                    const subtopicQuestions = filteredQuestions.filter(
                      (question) =>
                        questionMatchesSubtopic(question, subtopic.title)
                    );
                    const stats = getQuestionGroupStats(subtopicQuestions, progress);
                    const mastery = getMastery(stats);
                    const percent =
                      stats.totalQuestions > 0
                        ? Math.round(
                            (stats.answeredQuestions / stats.totalQuestions) * 100
                          )
                        : 0;
                    const checked = selectedTopics.has(subtopic.title);

                    return (
                      <label
                        className={[
                          "grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 rounded-xl px-2 py-2.5 transition",
                          checked || stats.totalQuestions > 0
                            ? "cursor-pointer hover:bg-slate-50"
                            : "cursor-not-allowed opacity-50"
                        ].join(" ")}
                        key={subtopic.title}
                      >
                        <input
                          checked={checked}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          disabled={!checked && stats.totalQuestions === 0}
                          onChange={() => toggleTopic(subtopic.title)}
                          type="checkbox"
                        />
                        <span className="min-w-0 truncate text-sm font-semibold text-slate-800">
                          {subtopic.title}
                        </span>
                        <span className="hidden items-center gap-2 sm:flex">
                          <ProgressMeter percent={percent} />
                          <span className="min-w-14 text-right text-xs font-medium text-slate-500">
                            {stats.answeredQuestions.toLocaleString("en-US")}/
                            {stats.totalQuestions.toLocaleString("en-US")}
                          </span>
                        </span>
                        <span className="text-right text-xs font-bold text-slate-600">
                          {mastery !== null ? `${mastery}%` : "—"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </StudentShell>
  );
}

function SetupSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((item) => (
        <div
          className="h-40 animate-pulse rounded-2xl bg-slate-100"
          key={item}
        />
      ))}
    </div>
  );
}
