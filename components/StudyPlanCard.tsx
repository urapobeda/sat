"use client";

import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import {
  getCurrentUser,
  getQuestionStats,
  getUserProgress,
  type RecentAttempt
} from "@/lib/supabase/queries";

const WEEKLY_GOAL = 5;

export function StudyPlanCard() {
  const [questionCount, setQuestionCount] = useState(0);
  const [attempts, setAttempts] = useState<RecentAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPlan() {
      setIsLoading(true);
      const [stats, user] = await Promise.all([
        getQuestionStats().catch(() => ({ math: 0, readingWriting: 0, total: 0 })),
        getCurrentUser().catch(() => null)
      ]);

      if (!isMounted) {
        return;
      }

      setQuestionCount(stats.total);

      if (user) {
        const progress = await getUserProgress(user.id).catch(() => null);

        if (isMounted) {
          setAttempts(progress?.attempts ?? []);
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    loadPlan();

    return () => {
      isMounted = false;
    };
  }, []);

  const weeklyCompleted = useMemo(
    () => attempts.filter((attempt) => isThisWeek(attempt.date)).length,
    [attempts]
  );
  const progress = Math.min((weeklyCompleted / WEEKLY_GOAL) * 100, 100);

  return (
    <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-400" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
            Today&apos;s Study Plan
          </p>
          <p className="mt-1 text-lg font-extrabold text-slate-950">
            Next up: Practice Questions
          </p>
        </div>
        <Button
          className="min-h-10 rounded-xl px-4 text-sm"
          href="/question-bank"
          icon={<ArrowRight size={17} />}
        >
          Continue
        </Button>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-2xl bg-blue-50 px-3 py-2 font-bold text-blue-700">
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={15} />
              Loading questions
            </span>
          ) : (
            `${questionCount} questions available`
          )}
        </div>
        <div className="rounded-2xl bg-violet-50 px-3 py-2 font-bold text-violet-700">
          Estimated time: 15-25 min
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2 font-semibold text-slate-600">
            <CheckCircle2 size={16} />
            Daily progress
          </span>
          <span className="font-bold text-slate-950">
            {weeklyCompleted} / {WEEKLY_GOAL} sessions completed
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-600"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </article>
  );
}

function isThisWeek(date: string) {
  const now = new Date();
  const attemptDate = new Date(date);
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);

  return attemptDate >= start;
}
