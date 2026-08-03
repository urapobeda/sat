"use client";

import {
  CheckCheck,
  Clock,
  FileText,
  Sparkles,
  Timer,
  TrendingUp,
  Trophy
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { ScoreProgressChart } from "@/components/tests/ScoreProgressChart";
import { StartTestCTA } from "@/components/tests/StartTestCTA";
import { StatCard } from "@/components/tests/StatCard";
import { TestInformationCard } from "@/components/tests/TestInformationCard";
import { TestListCard } from "@/components/tests/TestListCard";
import type { TestItem } from "@/components/tests/TestRow";
import { getCurrentUser, getTestHistory } from "@/lib/supabase/queries";
import type { TestSession } from "@/types/database";

const emptyStats = [
  {
    title: "Tests Taken",
    value: "0",
    description: "Total tests completed",
    icon: FileText,
    tone: "bg-blue-50 text-blue-600"
  },
  {
    title: "Average Score",
    value: "-",
    description: "Across all tests",
    icon: TrendingUp,
    tone: "bg-emerald-50 text-emerald-600"
  },
  {
    title: "Best Score",
    value: "-",
    description: "Complete a test first",
    icon: Trophy,
    tone: "bg-violet-50 text-violet-600"
  },
  {
    title: "Total Time",
    value: "0m",
    description: "Time spent testing",
    icon: Clock,
    tone: "bg-orange-50 text-orange-600"
  }
];

export function TestsPage() {
  const [history, setHistory] = useState<TestSession[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadTestHistory() {
      setIsLoading(true);
      setNotice(null);

      try {
        const user = await getCurrentUser().catch(() => null);

        if (!isMounted) {
          return;
        }

        if (!user) {
          setNotice("Guest mode: sign in to save full test sessions in Supabase.");
          setHistory([]);
          return;
        }

        const testHistory = await getTestHistory(user.id);

        if (isMounted) {
          setHistory(testHistory);
        }
      } catch (requestError) {
        if (isMounted) {
          setNotice(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load Supabase test history."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTestHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  const completedHistory = history.filter((record) => record.completed_at);
  const dashboardStats = useMemo(
    () =>
      completedHistory.length > 0
        ? getStatsFromHistory(completedHistory)
        : emptyStats,
    [completedHistory]
  );
  const tests = useMemo(
    () =>
      completedHistory.length > 0
        ? completedHistory.map((record, index) => mapTestSession(record, index))
        : [],
    [completedHistory]
  );
  const scoreHistory = completedHistory
    .slice()
    .reverse()
    .map(
      (record) =>
        record.estimated_sat_score ??
        Math.min(1600, 400 + Math.round(Number(record.percentage) * 12))
    );

  return (
    <Layout>
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-white p-6 shadow-soft sm:p-8">
        <HeaderIllustration />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="lg:max-w-2xl lg:pt-3">
            <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              Full-Length Tests
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg lg:max-w-xl">
              Take full-length SAT-style tests under real exam conditions. Track
              your performance and improve your score.
            </p>
          </div>

          <div className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white text-blue-600 shadow-lg shadow-blue-900/10 ring-1 ring-blue-100 lg:flex">
            <Timer size={52} />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      {notice ? (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-4 text-sm font-bold text-slate-700">
          {notice}
        </div>
      ) : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <TestListCard tests={isLoading ? [] : tests} />

        <div className="space-y-6">
          <TestInformationCard />
          <ScoreProgressChart scores={scoreHistory} />
        </div>
      </section>

      <section className="mt-6">
        <StartTestCTA />
      </section>
    </Layout>
  );
}

function getStatsFromHistory(history: TestSession[]) {
  const scores = history.map(
    (record) =>
      record.estimated_sat_score ??
      Math.min(1600, 400 + Math.round(Number(record.percentage) * 12))
  );
  const totalSeconds = history.reduce(
    (sum, record) => sum + (record.time_spent_seconds ?? 0),
    0
  );
  const averageScore = Math.round(
    scores.reduce((sum, score) => sum + score, 0) / Math.max(scores.length, 1)
  );
  const bestScore = Math.max(...scores);

  return [
    {
      title: "Tests Taken",
      value: String(history.length),
      description: "Total tests completed",
      icon: FileText,
      tone: "bg-blue-50 text-blue-600"
    },
    {
      title: "Average Score",
      value: `${averageScore} / 1600`,
      description: "Across all tests",
      icon: TrendingUp,
      tone: "bg-emerald-50 text-emerald-600"
    },
    {
      title: "Best Score",
      value: `${bestScore} / 1600`,
      description: "Saved in Supabase",
      icon: Trophy,
      tone: "bg-violet-50 text-violet-600"
    },
    {
      title: "Total Time",
      value: formatLongDuration(totalSeconds),
      description: "Time spent testing",
      icon: Clock,
      tone: "bg-orange-50 text-orange-600"
    }
  ];
}

function mapTestSession(record: TestSession, index: number): TestItem {
  const score =
    record.estimated_sat_score ??
    Math.min(1600, 400 + Math.round(Number(record.percentage) * 12));

  return {
    completedAt: formatRelativeDate(record.completed_at ?? record.started_at),
    duration: formatLongDuration(record.time_spent_seconds ?? 0),
    questions: record.total,
    score,
    sections: 2,
    title: `SAT Mini Test ${index + 1}`
  };
}

function formatLongDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function formatRelativeDate(date: string) {
  const diffMs = Date.now() - new Date(date).getTime();
  const days = Math.max(0, Math.round(diffMs / 86_400_000));

  if (days === 0) {
    return "today";
  }

  if (days === 1) {
    return "1 day ago";
  }

  return `${days} days ago`;
}

function HeaderIllustration() {
  return (
    <div className="pointer-events-none absolute right-[28%] top-6 hidden lg:block">
      <Sparkles className="absolute -left-11 top-9 text-emerald-400" size={17} />
      <Sparkles className="absolute -right-10 top-0 text-violet-500" size={18} />
      <Sparkles className="absolute left-6 -top-4 text-blue-400" size={16} />

      <div className="relative h-28 w-40">
        <div className="absolute left-0 top-0 h-24 w-20 rotate-6 rounded-2xl border-4 border-blue-300 bg-white shadow-lg">
          <div className="mx-auto -mt-2 h-5 w-10 rounded-lg bg-blue-300" />
          <div className="mt-5 space-y-2.5 px-4">
            {[0, 1, 2].map((item) => (
              <div className="flex items-center gap-2" key={item}>
                <CheckCheck className="text-blue-500" size={13} />
                <span className="h-2 flex-1 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 right-0 flex h-20 w-20 items-center justify-center rounded-full border-4 border-blue-500 bg-white text-blue-600 shadow-lg">
          <Timer size={39} />
        </div>
      </div>
    </div>
  );
}
