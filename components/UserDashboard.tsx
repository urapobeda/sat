"use client";

import { BarChart3, CalendarCheck2, Loader2, Target, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import {
  getCurrentUser,
  getProfile,
  getUserProgress,
  type RecentAttempt
} from "@/lib/supabase/queries";
import type { Profile } from "@/types/database";

type ProgressStats = Awaited<ReturnType<typeof getUserProgress>>;

export function UserDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        const user = await getCurrentUser().catch(() => null);

        if (!isMounted) {
          return;
        }

        if (!user) {
          setProfile(null);
          setStats(null);
          return;
        }

        const [loadedProfile, loadedStats] = await Promise.all([
          getProfile(user.id),
          getUserProgress(user.id)
        ]);

        if (isMounted) {
          setProfile(loadedProfile);
          setStats(loadedStats);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load dashboard."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const attempts = useMemo(() => stats?.attempts ?? [], [stats]);
  const weeklyCompleted = useMemo(
    () => attempts.filter((attempt) => isThisWeek(attempt.date)).length,
    [attempts]
  );

  if (isLoading) {
    return (
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-black text-blue-600">
          <Loader2 className="animate-spin" size={20} />
          Loading your dashboard...
        </div>
      </section>
    );
  }

  if (!profile && !stats) {
    return null;
  }

  if (error) {
    return (
      <section className="mt-6 rounded-3xl border border-rose-100 bg-rose-50 p-5 text-sm font-bold text-rose-700">
        {error}
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-blue-600">
            Student Dashboard
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Welcome back, {profile?.full_name || profile?.email || "Student"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Your latest Supabase progress, practice, and test activity.
          </p>
        </div>
        <div className="rounded-2xl bg-blue-50 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-blue-600">
            Weekly Goal
          </p>
          <p className="mt-1 text-2xl font-black text-slate-950">
            {weeklyCompleted} / 5 sessions
          </p>
          <ProgressBar className="mt-3 w-48" value={(weeklyCompleted / 5) * 100} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric
          icon={<Target size={22} />}
          label="Total Questions"
          tone="bg-blue-50 text-blue-600"
          value={String(stats?.questionsAnswered ?? 0)}
        />
        <DashboardMetric
          icon={<BarChart3 size={22} />}
          label="Average Accuracy"
          tone="bg-violet-50 text-violet-600"
          value={`${stats?.averageAccuracy ?? 0}%`}
        />
        <DashboardMetric
          icon={<Trophy size={22} />}
          label="Best Score"
          tone="bg-orange-50 text-orange-600"
          value={stats?.bestTestScore ? `${stats.bestTestScore}` : "-"}
        />
        <DashboardMetric
          icon={<CalendarCheck2 size={22} />}
          label="Sessions"
          tone="bg-emerald-50 text-emerald-600"
          value={String(stats?.totalSessions ?? 0)}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RecentList
          attempts={attempts.filter((attempt) => attempt.mode === "practice")}
          title="Latest Practice Sessions"
        />
        <RecentList
          attempts={attempts.filter((attempt) => attempt.mode === "test")}
          title="Latest Tests"
        />
      </div>
    </section>
  );
}

function DashboardMetric({
  icon,
  label,
  tone,
  value
}: {
  icon: ReactNode;
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
        {icon}
      </div>
      <p className="mt-4 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-bold text-slate-500">{label}</p>
    </article>
  );
}

function RecentList({
  attempts,
  title
}: {
  attempts: RecentAttempt[];
  title: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="font-black text-slate-950">{title}</h3>
      <div className="mt-3 space-y-2">
        {attempts.slice(0, 3).length > 0 ? (
          attempts.slice(0, 3).map((attempt) => (
            <div
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"
              key={attempt.id}
            >
              <span className="font-bold text-slate-600">
                {formatDate(attempt.date)}
              </span>
              <span className="font-black text-blue-600">{attempt.percentage}%</span>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
            No saved activity yet.
          </p>
        )}
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

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date(date));
}
