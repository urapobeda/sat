"use client";

import { BarChart3, Flame, Loader2, Target, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUser, getUserProgress } from "@/lib/supabase/queries";

type ProgressStats = Awaited<ReturnType<typeof getUserProgress>>;

export function ProgressCard() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProgress() {
      setIsLoading(true);
      const user = await getCurrentUser().catch(() => null);

      if (!isMounted) {
        return;
      }

      if (!user) {
        setStats(null);
        setIsLoading(false);
        return;
      }

      const progress = await getUserProgress(user.id).catch(() => null);

      if (isMounted) {
        setStats(progress);
        setIsLoading(false);
      }
    }

    loadProgress();

    return () => {
      isMounted = false;
    };
  }, []);

  const trendPoints = useMemo(() => {
    const attempts = stats?.attempts.slice(0, 6).reverse() ?? [];

    if (attempts.length === 0) {
      return [];
    }

    return attempts.map((attempt, index) => {
      const x = 20 + index * (286 / Math.max(attempts.length - 1, 1));
      const y = 104 - attempt.percentage;
      return { x, y: Math.max(16, Math.min(104, y)) };
    });
  }, [stats]);
  const bestScore = stats?.bestTestScore ?? 0;
  const averageAccuracy = stats?.averageAccuracy ?? 0;
  const questionsAnswered = stats?.questionsAnswered ?? 0;
  const sessions = stats?.totalSessions ?? 0;

  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div className="absolute -left-3 top-14 hidden h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/25 sm:flex">
        <BarChart3 size={28} />
      </div>
      <div className="absolute -right-2 top-20 hidden h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-white shadow-xl shadow-emerald-400/25 sm:flex">
        <Target size={30} />
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-5 shadow-2xl shadow-blue-950/10 backdrop-blur sm:p-6 lg:rotate-1">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-violet-500 to-emerald-400" />
        <div className="flex items-start justify-between gap-4">
          <p className="text-lg font-black text-slate-950">Your Progress</p>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            Live Data
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[0.78fr_1.22fr]">
          <div className="rounded-2xl bg-slate-50/90 p-4">
            <p className="text-sm font-semibold text-slate-600">Best Score</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-4xl font-black text-slate-950">
                {isLoading ? <Loader2 className="animate-spin" size={28} /> : bestScore || "-"}
              </span>
              <span className="pb-1.5 text-sm font-bold text-slate-500">
                / 1600
              </span>
            </div>
            <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-emerald-600">
              <TrendingUp size={16} />
              {sessions ? `${sessions} saved sessions` : "Sign in to save progress"}
            </p>
          </div>

          <div className="h-28 rounded-2xl bg-gradient-to-b from-blue-50 to-white p-3">
            <svg
              aria-label="Weekly SAT score trend"
              className="h-full w-full"
              role="img"
              viewBox="0 0 320 118"
            >
              <defs>
                <linearGradient id="scoreFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              {trendPoints.length > 1 ? (
                <polyline
                  fill="none"
                  points={trendPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                  stroke="#2563eb"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="5"
                />
              ) : (
                <text fill="#64748b" fontSize="16" fontWeight="800" x="48" y="64">
                  Complete sessions to see a trend
                </text>
              )}
              {trendPoints.map((point) => (
                <circle
                  cx={point.x}
                  cy={point.y}
                  fill="#2563eb"
                  key={`${point.x}-${point.y}`}
                  r="5"
                  stroke="white"
                  strokeWidth="3"
                />
              ))}
            </svg>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <MiniMetric
            label="Average Accuracy"
            tone="bg-blue-600"
            value={`${averageAccuracy}%`}
            width={`${averageAccuracy}%`}
          />
          <MiniMetric
            label="Questions Answered"
            tone="bg-violet-600"
            value={String(questionsAnswered)}
            width={`${Math.min(questionsAnswered * 4, 100)}%`}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetricTile icon={<Target size={18} />} label="Accuracy" value={`${averageAccuracy}%`} />
          <MetricTile icon={<Flame size={18} />} label="Sessions" value={String(sessions)} />
        </div>
      </div>

      <div className="pointer-events-none absolute -bottom-8 right-3 hidden w-36 opacity-90 lg:block">
        <div className="relative mx-auto h-16 w-24 rounded-[50%] bg-gradient-to-br from-violet-500 to-blue-600 shadow-2xl shadow-blue-800/20">
          <div className="absolute -top-6 left-1/2 h-11 w-32 -translate-x-1/2 rotate-3 rounded-xl bg-gradient-to-br from-violet-400 to-blue-600 shadow-xl" />
          <div className="absolute right-1 top-0 h-12 w-1 rounded-full bg-amber-300" />
          <div className="absolute right-0 top-10 h-6 w-2 rounded-full bg-amber-400" />
        </div>
        <div className="mt-1 h-5 rounded-lg bg-blue-200 shadow-lg" />
        <div className="mx-3 h-5 rounded-lg bg-white shadow-lg" />
        <div className="mx-1 h-5 rounded-lg bg-blue-700 shadow-lg" />
      </div>
    </div>
  );
}

type MiniMetricProps = {
  label: string;
  tone: string;
  value: string;
  width: string;
};

function MiniMetric({ label, tone, value, width }: MiniMetricProps) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">
        {value}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width }} />
      </div>
    </div>
  );
}

type MetricTileProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function MetricTile({ icon, label, value }: MetricTileProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-3">
      <div className="flex items-center gap-2 text-blue-600">{icon}</div>
      <p className="mt-2 text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
