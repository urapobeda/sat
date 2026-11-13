"use client";

import { BookOpen, RotateCcw, Search, SquareRadical } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { AccuracyByDifficultyCard } from "@/components/question-bank/AccuracyByDifficultyCard";
import { AccuracyByTopicCard } from "@/components/question-bank/AccuracyByTopicCard";
import { ActivityTrendCard } from "@/components/question-bank/ActivityTrendCard";
import { QuestionAnalyticsRow } from "@/components/question-bank/QuestionAnalyticsRow";
import { SectionHeroCard } from "@/components/question-bank/SectionHeroCard";
import { StudyBearIllustration } from "@/components/question-bank/StudyBearIllustration";
import { TimeShareByDifficultyCard } from "@/components/question-bank/TimeShareByDifficultyCard";
import { TimeByTopicCard } from "@/components/question-bank/TimeByTopicCard";
import { getQuestionTimingSummaries, summarizeQuestionTimings } from "@/lib/practiceTiming";
import {
  getCategoriesForSection,
  getQuestionCategory,
  getQuestionGroupStats,
  questionMatchesSubtopic,
  type QuestionProgressLookup
} from "@/lib/questionBankStructure";
import {
  getCurrentUser,
  getMarkedQuestionIds,
  getPracticeAnswerTimings,
  getQuestionProgressLookup,
  getQuestionCatalog,
  primeQuestionCatalog,
  getWeeklyQuestionActivity,
  type PracticeAnswerTiming,
  type WeeklyActivityPoint
} from "@/lib/supabase/queries";
import type { QuestionSummary } from "@/types/sat";

const EMPTY_PROGRESS: QuestionProgressLookup = {
  answeredIds: new Set<string>(),
  correctIds: new Set<string>(),
  incorrectIds: new Set<string>()
};

const SECTIONS = [
  {
    icon: BookOpen,
    key: "reading-writing" as const,
    title: "Reading & Writing",
    heroGradient: "from-violet-500 via-purple-600 to-purple-700"
  },
  {
    icon: SquareRadical,
    key: "math" as const,
    title: "Math",
    heroGradient: "from-sky-400 via-blue-500 to-blue-700"
  }
];

const DIFFICULTIES = [
  { key: "easy" as const, label: "Easy" },
  { key: "medium" as const, label: "Medium" },
  { key: "hard" as const, label: "Hard" }
];

export function QuestionBankPage({ initialCatalog = null }: { initialCatalog?: QuestionSummary[] | null }) {
  const [questions, setQuestions] = useState<QuestionSummary[]>(initialCatalog ?? []);
  const [progress, setProgress] = useState<QuestionProgressLookup>(EMPTY_PROGRESS);
  const [markedQuestionIds, setMarkedQuestionIds] = useState<Set<string>>(
    new Set()
  );
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivityPoint[]>([]);
  const [timings, setTimings] = useState<PracticeAnswerTiming[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(initialCatalog === null);
  const [analyticsFailures, setAnalyticsFailures] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadQuestionBank = useCallback(async () => {
    setIsLoading(initialCatalog === null);
    setError(null);
    setAnalyticsFailures([]);

    try {
      const userRequest = getCurrentUser().catch(() => null);
      if (initialCatalog) primeQuestionCatalog(initialCatalog);
      const loadedQuestions = await getQuestionCatalog();
      setQuestions(loadedQuestions);
      setIsLoading(false);
      const user = await userRequest;

      if (!user) {
        setProgress(EMPTY_PROGRESS);
        setMarkedQuestionIds(new Set());
        setWeeklyActivity([]);
        setTimings([]);
        setIsSignedIn(false);
        return;
      }

      setIsSignedIn(true);

      const [progress, marks, activity, timings] = await Promise.allSettled([
        getQuestionProgressLookup(user.id),
        getMarkedQuestionIds(user.id),
        getWeeklyQuestionActivity(user.id),
        getPracticeAnswerTimings(user.id)
      ]);

      setProgress(progress.status === "fulfilled" ? progress.value : EMPTY_PROGRESS);
      setMarkedQuestionIds(marks.status === "fulfilled" ? marks.value : new Set());
      setWeeklyActivity(activity.status === "fulfilled" ? activity.value : []);
      setTimings(timings.status === "fulfilled" ? timings.value : []);
      setAnalyticsFailures([
        progress.status === "rejected" ? "progress" : null,
        marks.status === "rejected" ? "saved questions" : null,
        activity.status === "rejected" ? "weekly activity" : null,
        timings.status === "rejected" ? "timing" : null
      ].filter((feature): feature is string => feature !== null));
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
  }, [initialCatalog]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadQuestionBank();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadQuestionBank]);

  const accuracyPercent =
    progress.answeredIds.size > 0
      ? Math.round((progress.correctIds.size / progress.answeredIds.size) * 100)
      : null;

  const topicAccuracyBySection = useMemo(
    () =>
      Object.fromEntries(
        SECTIONS.map((section) => {
          const sectionQuestions = questions.filter(
            (question) => question.section === section.key
          );
          const categories = getCategoriesForSection(section.key);

          const rows = categories.map((category) => {
            const categoryQuestions = sectionQuestions.filter(
              (question) => getQuestionCategory(question) === category.title
            );
            const stats = getQuestionGroupStats(categoryQuestions, progress);

            return {
              accuracy:
                stats.answeredQuestions > 0
                  ? Math.round((stats.correctQuestions / stats.answeredQuestions) * 100)
                  : null,
              attempts: stats.answeredQuestions,
              title: category.title
            };
          });

          return [section.key, rows];
        })
      ),
    [questions, progress]
  );

  const difficultyAccuracyBySection = useMemo(
    () =>
      Object.fromEntries(
        SECTIONS.map((section) => {
          const sectionQuestions = questions.filter(
            (question) => question.section === section.key
          );

          const rows = DIFFICULTIES.map((difficulty) => {
            const difficultyQuestions = sectionQuestions.filter(
              (question) => question.difficulty === difficulty.key
            );
            const stats = getQuestionGroupStats(difficultyQuestions, progress);

            return {
              accuracy:
                stats.answeredQuestions > 0
                  ? Math.round((stats.correctQuestions / stats.answeredQuestions) * 100)
                  : null,
              label: difficulty.label
            };
          });

          return [section.key, rows];
        })
      ),
    [questions, progress]
  );

  const timingSummaries = useMemo(() => getQuestionTimingSummaries(timings), [timings]);
  const timeShareBySection = useMemo(() => {
    return Object.fromEntries(
      SECTIONS.map((section) => {
        const sectionQuestions = questions.filter(
          (question) => question.section === section.key
        );

        const rows = DIFFICULTIES.map((difficulty) => {
          return {
            ...summarizeQuestionTimings(sectionQuestions.filter((q) => q.difficulty === difficulty.key), timingSummaries),
            label: difficulty.label
          };
        });

        return [section.key, rows];
      })
    );
  }, [questions, timingSummaries]);

  const timeByTopic = useMemo(() => Object.fromEntries(SECTIONS.map((section) => {
    const sectionQuestions = questions.filter((q) => q.section === section.key);
    return [section.key, getCategoriesForSection(section.key).flatMap((category) => category.subtopics.map((topic) => ({
      label: topic.title,
      ...summarizeQuestionTimings(sectionQuestions.filter((q) => questionMatchesSubtopic(q, topic.title)), timingSummaries)
    })))];
  })), [questions, timingSummaries]);

  return (
    <StudentShell active="question-bank">
      <section className="mx-auto w-full max-w-7xl space-y-5">
        <section className="hub-card relative overflow-hidden p-5 sm:p-7">
          <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-blue-600">
                  <BookOpen size={24} />
                </span>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Question Bank
                </h1>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                Practice questions by section, topic, and difficulty. Mark the
                important ones, track your progress, and return to the
                questions you find hardest.
              </p>
            </div>

            <StudyBearIllustration />
          </div>
        </section>

        {isLoading ? (
          <QuestionBankSkeleton />
        ) : error ? (
          <QuestionBankError
            message={error}
            onRetry={() => void loadQuestionBank()}
          />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              {SECTIONS.map((section) => {
                const stats = getQuestionGroupStats(
                  questions.filter((question) => question.section === section.key),
                  progress
                );

                return (
                  <SectionHeroCard
                    answered={stats.answeredQuestions}
                    gradient={section.heroGradient}
                    href={`/question-bank/${section.key}`}
                    icon={section.icon}
                    key={section.key}
                    title={section.title}
                    total={stats.totalQuestions}
                  />
                );
              })}
            </div>

            {analyticsFailures.length ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-800" role="status">
                Some analytics could not be loaded ({analyticsFailures.join(", ")}).
                <button className="ml-2 cursor-pointer font-semibold underline" onClick={() => void loadQuestionBank()} type="button">Retry</button>
              </p>
            ) : null}
            <div>
              <h2 className="mb-3 text-lg font-bold text-slate-950">
                Question Analytics
              </h2>
              <QuestionAnalyticsRow
                accuracyPercent={accuracyPercent}
                attempted={progress.answeredIds.size}
                saved={markedQuestionIds.size}
              />
            </div>

            <ActivityTrendCard isSignedIn={isSignedIn} weeks={weeklyActivity} />

            <div>
              <h2 className="mb-3 text-lg font-bold text-slate-950">
                Deeper Insights
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {SECTIONS.map((section) => (
                  <AccuracyByTopicCard
                    key={section.key}
                    rows={topicAccuracyBySection[section.key] ?? []}
                    sectionLabel={section.title}
                  />
                ))}
                {SECTIONS.map((section) => (
                  <AccuracyByDifficultyCard
                    key={section.key}
                    rows={difficultyAccuracyBySection[section.key] ?? []}
                    sectionLabel={section.title}
                  />
                ))}
                {SECTIONS.map((section) => (
                  <TimeShareByDifficultyCard
                    key={section.key}
                    rows={timeShareBySection[section.key] ?? []}
                    sectionLabel={section.title}
                  />
                ))}
                {SECTIONS.map((section) => (
                  <TimeByTopicCard key={`timing-${section.key}`} rows={timeByTopic[section.key] ?? []} sectionLabel={section.title} />
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </StudentShell>
  );
}

function QuestionBankSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {[0, 1].map((item) => (
          <div
            className="h-44 animate-pulse rounded-3xl bg-slate-100"
            key={item}
          />
        ))}
      </div>
      <div className="h-32 animate-pulse rounded-3xl bg-slate-100" />
      <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
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
      <h2 className="mt-3 text-xl font-semibold text-rose-900">
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
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700"
        onClick={onRetry}
        type="button"
      >
        <RotateCcw size={17} />
        Retry
      </button>
    </div>
  );
}
