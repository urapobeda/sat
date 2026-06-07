"use client";

import {
  BarChart3,
  ClipboardList,
  Loader2,
  Target,
  Trash2,
  Trophy
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import {
  clearUserProgress,
  getCurrentUser,
  getUserProgress,
  getWeakAreas,
  type RecentAttempt
} from "@/lib/supabase/queries";

type ProgressStats = Awaited<ReturnType<typeof getUserProgress>>;
type WeakArea = Awaited<ReturnType<typeof getWeakAreas>>[number];

export function ProgressDashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestMessage, setGuestMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProgress() {
      setIsLoading(true);
      setError(null);
      setGuestMessage(null);

      try {
        const user = await getCurrentUser().catch(() => null);

        if (!isMounted) {
          return;
        }

        if (!user) {
          setUserId(null);
          setStats(null);
          setWeakAreas([]);
          setGuestMessage(
            "No progress yet. Start practicing to see your stats. Sign in to save progress with Supabase."
          );
          return;
        }

        setUserId(user.id);
        const [progressStats, areas] = await Promise.all([
          getUserProgress(user.id),
          getWeakAreas(user.id)
        ]);

        if (isMounted) {
          setStats(progressStats);
          setWeakAreas(areas);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load progress from Supabase."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProgress();

    return () => {
      isMounted = false;
    };
  }, []);

  const attempts = useMemo(() => stats?.attempts ?? [], [stats]);
  const chartRecords = useMemo(() => attempts.slice(0, 6).reverse(), [attempts]);

  async function handleClearProgress() {
    if (!userId) {
      return;
    }

    setIsClearing(true);

    try {
      await clearUserProgress(userId);
      setStats({
        attempts: [],
        averageAccuracy: 0,
        bestTestScore: 0,
        questionsAnswered: 0,
        totalSessions: 0
      });
      setWeakAreas([]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to clear progress."
      );
    } finally {
      setIsClearing(false);
    }
  }

  if (isLoading) {
    return (
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-black text-blue-600">
          <Loader2 className="animate-spin" size={20} />
          Loading progress from Supabase...
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div className="h-28 animate-pulse rounded-2xl bg-slate-100" key={item} />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <EmptyState
        description={error}
        icon={<BarChart3 size={26} />}
        title="Progress unavailable"
      />
    );
  }

  if (guestMessage || !stats || stats.totalSessions === 0) {
    return (
      <EmptyState
        description={guestMessage ?? "No progress yet. Start practicing to see your stats."}
        icon={<BarChart3 size={26} />}
        title="No progress yet"
      />
    );
  }

  return (
    <section className="mt-8 space-y-6">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<ClipboardList size={24} />}
          label="Total sessions"
          tone="bg-blue-50 text-blue-600"
          value={String(stats.totalSessions)}
        />
        <StatCard
          icon={<Target size={24} />}
          label="Questions answered"
          tone="bg-emerald-50 text-emerald-600"
          value={String(stats.questionsAnswered)}
        />
        <StatCard
          icon={<BarChart3 size={24} />}
          label="Average accuracy"
          tone="bg-violet-50 text-violet-600"
          value={`${stats.averageAccuracy}%`}
        />
        <StatCard
          icon={<Trophy size={24} />}
          label="Best test score"
          tone="bg-orange-50 text-orange-600"
          value={stats.bestTestScore ? `${stats.bestTestScore}` : "-"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Progress over time
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Accuracy trend from your Supabase practice and test sessions.
                </p>
              </div>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-100 bg-white px-4 py-2.5 text-sm font-black text-rose-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                disabled={isClearing}
                onClick={handleClearProgress}
                type="button"
              >
                {isClearing ? <Loader2 className="animate-spin" size={17} /> : <Trash2 size={17} />}
                Clear Progress
              </button>
            </div>
            <ProgressChart records={chartRecords} />
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black text-slate-950">Recent attempts</h2>
            <div className="mt-5 space-y-3">
              {attempts.slice(0, 8).map((record) => (
                <AttemptRow key={record.id} record={record} />
              ))}
            </div>
          </article>
        </div>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Weak areas</h2>
          <div className="mt-5 space-y-4">
            {weakAreas.length > 0 ? (
              weakAreas.map((area) => (
                <div key={area.topic}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-950">
                      {area.topic}
                    </p>
                    <span className="text-xs font-black text-slate-500">
                      {area.count} misses
                    </span>
                  </div>
                  <ProgressBar
                    className="mt-2"
                    tone={area.count > 1 ? "bg-orange-500" : "bg-yellow-500"}
                    value={Math.min(area.count * 30, 100)}
                  />
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                Complete a practice or test session with missed answers to see weak areas.
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

type StatCardProps = {
  icon: ReactNode;
  label: string;
  tone: string;
  value: string;
};

function StatCard({ icon, label, tone, value }: StatCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}
        >
          {icon}
        </span>
        <div>
          <p className="text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
        </div>
      </div>
    </article>
  );
}

type AttemptRowProps = {
  record: RecentAttempt;
};

function AttemptRow({ record }: AttemptRowProps) {
  const isPractice = record.mode === "practice";
  const subtitle = isPractice
    ? [record.section, record.topic].filter(Boolean).join(" / ") || "Practice"
    : `Time spent: ${formatDuration(record.timeSpent ?? 0)}`;

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-slate-50 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              "rounded-full px-3 py-1 text-xs font-black uppercase",
              isPractice
                ? "bg-blue-50 text-blue-700"
                : "bg-violet-50 text-violet-700"
            ].join(" ")}
          >
            {record.mode}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
            {subtitle}
          </span>
        </div>
        <h3 className="mt-3 text-lg font-black text-slate-950">
          {record.score} of {record.total} correct
        </h3>
        <p className="mt-1 text-sm text-slate-500">{formatDate(record.date)}</p>
      </div>
      <div className="rounded-2xl bg-slate-50 px-5 py-3 text-left sm:text-right">
        <p className="text-2xl font-black text-blue-600">{record.percentage}%</p>
        {record.mode === "test" && record.estimatedScore ? (
          <p className="text-xs font-bold text-slate-500">
            SAT {record.estimatedScore}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ProgressChart({ records }: { records: RecentAttempt[] }) {
  if (records.length === 0) {
    return null;
  }

  const points = records.map((record, index) => {
    const x = 36 + index * (300 / Math.max(records.length - 1, 1));
    const y = 150 - record.percentage * 1.2;
    return { label: record.mode, percentage: record.percentage, x, y };
  });

  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-b from-white to-blue-50/40 p-4">
      <svg className="h-56 w-full" role="img" viewBox="0 0 380 190">
        {[100, 75, 50, 25].map((value) => {
          const y = 150 - value * 1.2;

          return (
            <g key={value}>
              <line stroke="#e2e8f0" x1="32" x2="360" y1={y} y2={y} />
              <text fill="#64748b" fontSize="12" fontWeight="700" x="0" y={y + 4}>
                {value}
              </text>
            </g>
          );
        })}
        <polyline
          fill="none"
          points={points.map((point) => `${point.x},${point.y}`).join(" ")}
          stroke="#2563eb"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              fill="#2563eb"
              r="6"
              stroke="white"
              strokeWidth="3"
            />
            <text
              fill="#0f172a"
              fontSize="12"
              fontWeight="800"
              textAnchor="middle"
              x={point.x}
              y={point.y - 12}
            >
              {point.percentage}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(date));
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
