"use client";

import { BookOpen, RotateCcw, Search, SquareRadical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { AccuracyByDifficultyCard } from "@/components/question-bank/AccuracyByDifficultyCard";
import { AccuracyByTopicCard } from "@/components/question-bank/AccuracyByTopicCard";
import { ActivityTrendCard } from "@/components/question-bank/ActivityTrendCard";
import { QuestionAnalyticsRow } from "@/components/question-bank/QuestionAnalyticsRow";
import { SectionHeroCard } from "@/components/question-bank/SectionHeroCard";
import { StudyBearIllustration } from "@/components/question-bank/StudyBearIllustration";
import { TimeShareByDifficultyCard } from "@/components/question-bank/TimeShareByDifficultyCard";
import {
  getCategoriesForSection,
  getQuestionCategory,
  getQuestionGroupStats,
  type QuestionProgressLookup
} from "@/lib/questionBankStructure";
import {
  getCurrentUser,
  getMarkedQuestionIds,
  getPracticeAnswerTimings,
  getQuestionProgressLookup,
  getQuestions,
  getWeeklyQuestionActivity,
  type PracticeAnswerTiming,
  type WeeklyActivityPoint
} from "@/lib/supabase/queries";
import type { Question } from "@/types/sat";

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

// Study streak is not tracked anywhere yet (no daily-activity table in
// Supabase), so it is shown as a static placeholder.
const STUDY_STREAK_PLACEHOLDER = 0;

const DIFFICULTIES = [
  { key: "easy" as const, label: "Easy" },
  { key: "medium" as const, label: "Medium" },
  { key: "hard" as const, label: "Hard" }
];

export function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<QuestionProgressLookup>(EMPTY_PROGRESS);
  const [markedQuestionIds, setMarkedQuestionIds] = useState<Set<string>>(
    new Set()
  );
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivityPoint[]>([]);
  const [timings, setTimings] = useState<PracticeAnswerTiming[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
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
        setMarkedQuestionIds(new Set());
        setWeeklyActivity([]);
        setTimings([]);
        setIsSignedIn(false);
        return;
      }

      setIsSignedIn(true);

      const [
        loadedProgress,
        loadedMarkedQuestionIds,
        loadedWeeklyActivity,
        loadedTimings
      ] = await Promise.all([
        getQuestionProgressLookup(user.id),
        getMarkedQuestionIds(user.id).catch(() => new Set<string>()),
        getWeeklyQuestionActivity(user.id).catch(() => []),
        getPracticeAnswerTimings(user.id).catch(() => [])
      ]);

      setProgress(loadedProgress);
      setMarkedQuestionIds(loadedMarkedQuestionIds);
      setWeeklyActivity(loadedWeeklyActivity);
      setTimings(loadedTimings);
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

  const timeShareBySection = useMemo(() => {
    const timeByQuestionId = new Map(
      timings.map((timing) => [timing.questionId, timing.timeSpentSeconds])
    );

    return Object.fromEntries(
      SECTIONS.map((section) => {
        const sectionQuestions = questions.filter(
          (question) => question.section === section.key
        );

        const rows = DIFFICULTIES.map((difficulty) => {
          const times = sectionQuestions
            .filter((question) => question.difficulty === difficulty.key)
            .map((question) => timeByQuestionId.get(question.id))
            .filter((value): value is number => typeof value === "number");

          return {
            attempts: times.length,
            avgSeconds:
              times.length > 0
                ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length)
                : null,
            label: difficulty.label
          };
        });

        return [section.key, rows];
      })
    );
  }, [questions, timings]);

  return (
    <StudentShell active="question-bank">
      <section className="mx-auto w-full max-w-7xl space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-indigo-50 to-white p-6 shadow-sm sm:p-8">
          <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-blue-600">
                  <BookOpen size={24} />
                </span>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
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

            <div>
              <h2 className="mb-3 text-lg font-bold text-slate-950">
                Question Analytics
              </h2>
              <QuestionAnalyticsRow
                accuracyPercent={accuracyPercent}
                attempted={progress.answeredIds.size}
                saved={markedQuestionIds.size}
                streak={STUDY_STREAK_PLACEHOLDER}
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
