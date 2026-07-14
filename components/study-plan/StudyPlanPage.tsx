"use client";

import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Loader2,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  Target,
  Trophy
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Layout } from "@/components/Layout";
import { SATCountdown } from "@/components/SATCountdown";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import {
  getCurrentUser,
  getOrCreateStudyPlan,
  getStrongAreas,
  getUserProgress,
  getWeakAreas,
  updateStudyPlan,
  type RecentAttempt
} from "@/lib/supabase/queries";
import type { StudyPlan } from "@/types/database";

const TARGET_SCORE_FALLBACK = 1500;

export function StudyPlanPage() {
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [attempts, setAttempts] = useState<RecentAttempt[]>([]);
  const [weakAreas, setWeakAreas] = useState<Array<{ count: number; topic: string }>>([]);
  const [strongAreas, setStrongAreas] = useState<
    Array<{ accuracy: number; topic: string }>
  >([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [targetScore, setTargetScore] = useState(String(TARGET_SCORE_FALLBACK));
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadStudyPlan() {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const user = await getCurrentUser().catch(() => null);

      if (!user) {
        setIsAuthenticated(false);
        setStudyPlan(null);
        setAttempts([]);
        setWeakAreas([]);
        setStrongAreas([]);
        return;
      }

      setIsAuthenticated(true);
      const [plan, progress, weak, strong] = await Promise.all([
        getOrCreateStudyPlan(user.id),
        getUserProgress(user.id),
        getWeakAreas(user.id),
        getStrongAreas(user.id)
      ]);

      setStudyPlan(plan);
      setTargetScore(String(plan.target_score));
      setAttempts(progress.attempts);
      setWeakAreas(weak);
      setStrongAreas(strong);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load your study plan."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadStudyPlan();
  }, []);

  const currentEstimatedScore = useMemo(() => {
    const testScores = attempts
      .filter((attempt) => attempt.mode === "test")
      .map((attempt) => attempt.estimatedScore ?? 0)
      .filter(Boolean);

    if (testScores.length > 0) {
      return testScores[0];
    }

    const averageAccuracy =
      attempts.length > 0
        ? Math.round(
            attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) /
              attempts.length
          )
        : 0;

    return averageAccuracy ? Math.min(1600, 400 + averageAccuracy * 12) : 0;
  }, [attempts]);
  const weeklyCompleted = useMemo(
    () =>
      attempts
        .filter((attempt) => isThisWeek(attempt.date))
        .reduce((sum, attempt) => sum + attempt.total, 0),
    [attempts]
  );
  const todayCompleted = useMemo(
    () =>
      attempts
        .filter((attempt) => isToday(attempt.date))
        .reduce((sum, attempt) => sum + attempt.total, 0),
    [attempts]
  );
  const recommendedTopics = useMemo(() => {
    const weakTopics = weakAreas.map((area) => area.topic);

    if (weakTopics.length >= 3) {
      return weakTopics.slice(0, 3);
    }

    return [...weakTopics, "Algebra", "Transitions", "Vocabulary in Context"]
      .filter((topic, index, topics) => topics.indexOf(topic) === index)
      .slice(0, 3);
  }, [weakAreas]);
  const weeklyGoal = studyPlan?.weekly_goal ?? 120;
  const dailyGoal = studyPlan?.daily_goal ?? 25;
  const target = studyPlan?.target_score ?? TARGET_SCORE_FALLBACK;
  const scoreProgress = currentEstimatedScore
    ? Math.min((currentEstimatedScore / target) * 100, 100)
    : 0;
  const weeklyProgress = Math.min((weeklyCompleted / weeklyGoal) * 100, 100);
  const dailyProgress = Math.min((todayCompleted / dailyGoal) * 100, 100);

  async function saveTargetScore() {
    if (!studyPlan) {
      return;
    }

    const parsedTarget = Number(targetScore);

    if (!Number.isFinite(parsedTarget) || parsedTarget < 400 || parsedTarget > 1600) {
      setError("Target score must be between 400 and 1600.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedPlan = await updateStudyPlan(studyPlan.id, {
        target_score: parsedTarget
      });
      setStudyPlan(updatedPlan);
      setIsEditing(false);
      setSuccessMessage("Study plan updated. Recommendations refreshed.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update study plan."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-black text-blue-600">
            <Loader2 className="animate-spin" size={20} />
            Building your SAT Study Plan...
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div className="h-36 animate-pulse rounded-2xl bg-slate-100" key={item} />
            ))}
          </div>
        </section>
      </Layout>
    );
  }

  if (isAuthenticated === false) {
    return (
      <Layout>
        <EmptyState
          description="Sign in to create your personalized SAT Study Plan."
          icon={<LockKeyhole size={26} />}
          title="Personalized plan locked"
        />
      </Layout>
    );
  }

  if (error && !studyPlan) {
    return (
      <Layout>
        <section className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-center shadow-sm">
          <RotateCcw className="mx-auto text-rose-600" size={30} />
          <h1 className="mt-3 text-2xl font-black text-rose-900">
            Study Plan unavailable
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-rose-700">
            {error}
          </p>
          <button
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-600 px-5 text-sm font-black text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700"
            onClick={() => {
              void loadStudyPlan();
            }}
            type="button"
          >
            Retry
          </button>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-violet-50/60 p-6 shadow-soft sm:p-8">
        <div className="absolute right-8 top-8 hidden h-20 w-20 rounded-3xl bg-white/70 shadow-lg shadow-blue-900/10 lg:block" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-blue-600">
              Study Plan
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              Personalized SAT Prep Dashboard
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              Your weekly goals, countdown, recommendations, and calendar adapt
              automatically as you practice.
            </p>
          </div>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            onClick={() => setIsEditing((value) => !value)}
            type="button"
          >
            <Edit3 size={18} />
            Edit Study Plan
          </button>
        </div>
      </section>

      {successMessage ? (
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-700">
          {successMessage}
        </div>
      ) : null}
      {error && studyPlan ? (
        <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-black text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
            <SATCountdown compact />
            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.12em] text-blue-600">
                      Target Score
                    </p>
                    {isEditing ? (
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                        <input
                          className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-lg font-black text-slate-950 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                          max={1600}
                          min={400}
                          onChange={(event) => setTargetScore(event.target.value)}
                          type="number"
                          value={targetScore}
                        />
                        <button
                          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                          disabled={isSaving}
                          onClick={saveTargetScore}
                          type="button"
                        >
                          {isSaving ? <Loader2 className="animate-spin" size={17} /> : "Save"}
                        </button>
                      </div>
                    ) : (
                      <p className="mt-2 text-4xl font-black text-slate-950">
                        {target}
                      </p>
                    )}
                  </div>
                  <Target className="text-blue-600" size={34} />
                </div>
                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-600">
                    <span>Current Estimated</span>
                    <span className="text-slate-950">
                      {currentEstimatedScore || "Not enough data"}
                    </span>
                  </div>
                  <ProgressBar className="mt-2" value={scoreProgress} />
                </div>
              </div>

              <GoalCard
                label="Weekly Goal"
                progress={weeklyProgress}
                subtitle={`${weeklyCompleted} / ${weeklyGoal} completed`}
                title={`Solve ${weeklyGoal} Questions`}
              />
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-500" size={24} />
            <h2 className="text-xl font-black text-slate-950">Today&apos;s Tasks</h2>
          </div>
          <div className="mt-5 space-y-3">
            {buildTodayTasks(recommendedTopics, todayCompleted, dailyGoal).map((task) => (
              <TaskRow key={task.label} completed={task.completed} label={task.label} />
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-blue-50 p-4">
            <div className="flex items-center justify-between text-sm font-bold text-slate-600">
              <span>Today&apos;s Goal</span>
              <span className="text-slate-950">
                {todayCompleted} / {dailyGoal} questions
              </span>
            </div>
            <ProgressBar className="mt-2" value={dailyProgress} />
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <StudyCalendar attempts={attempts} />
        <Recommendations
          recommendedTopics={recommendedTopics}
          strongAreas={strongAreas}
          weakAreas={weakAreas}
        />
      </section>

      <section className="mt-6">
        <h2 className="text-2xl font-black text-slate-950">Upcoming Tasks</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UpcomingTask
            href={`/question-bank/practice?topic=${encodeURIComponent(recommendedTopics[0] ?? "Algebra")}`}
            icon={<BookOpenCheck size={23} />}
            title={`Practice ${recommendedTopics[0] ?? "Algebra"}`}
          />
          <UpcomingTask
            href="/tests/start"
            icon={<Clock3 size={23} />}
            title="Mini Reading Test"
          />
          <UpcomingTask
            href="/progress"
            icon={<RotateCcw size={23} />}
            title="Review Mistakes"
          />
          <UpcomingTask
            href="/question-bank"
            icon={<Trophy size={23} />}
            title="Timed Quiz"
          />
        </div>
      </section>
    </Layout>
  );
}

function GoalCard({
  label,
  progress,
  subtitle,
  title
}: {
  label: string;
  progress: number;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-black uppercase tracking-[0.12em] text-violet-600">
        {label}
      </p>
      <h3 className="mt-2 text-2xl font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm font-bold text-slate-600">{subtitle}</p>
      <ProgressBar className="mt-4" tone="bg-violet-600" value={progress} />
    </div>
  );
}

function TaskRow({ completed, label }: { completed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <span
        className={[
          "flex h-7 w-7 items-center justify-center rounded-full text-sm font-black",
          completed ? "bg-emerald-500 text-white" : "bg-white text-slate-400 ring-1 ring-slate-200"
        ].join(" ")}
      >
        {completed ? "✓" : "□"}
      </span>
      <span className="font-bold text-slate-700">{label}</span>
    </div>
  );
}

function StudyCalendar({ attempts }: { attempts: RecentAttempt[] }) {
  const days = Array.from({ length: 14 }, (_item, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + index);
    date.setHours(0, 0, 0, 0);

    return date;
  });

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="text-blue-600" size={24} />
        <h2 className="text-xl font-black text-slate-950">Study Calendar</h2>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-7">
        {days.map((date) => {
          const status = getDayStatus(date, attempts);

          return (
            <div
              className={[
                "rounded-2xl border p-3 text-center",
                status === "Completed"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : status === "Today"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-slate-50 text-slate-500"
              ].join(" ")}
              key={date.toISOString()}
            >
              <p className="text-xs font-black uppercase">
                {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date)}
              </p>
              <p className="mt-1 text-2xl font-black">{date.getDate()}</p>
              <p className="mt-1 text-xs font-bold">{status}</p>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function Recommendations({
  recommendedTopics,
  strongAreas,
  weakAreas
}: {
  recommendedTopics: string[];
  strongAreas: Array<{ accuracy: number; topic: string }>;
  weakAreas: Array<{ count: number; topic: string }>;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <Sparkles className="text-violet-600" size={24} />
        <h2 className="text-xl font-black text-slate-950">
          Personalized Recommendations
        </h2>
      </div>

      <div className="mt-5 grid gap-4">
        <TopicList
          emptyText="Complete sessions to reveal weak areas."
          items={weakAreas.map((area) => `${area.topic} (${area.count} misses)`)}
          title="Weak Areas"
          tone="bg-orange-50 text-orange-700"
        />
        <TopicList
          emptyText="Correct answers will appear here."
          items={strongAreas.map((area) => `${area.topic} (${area.accuracy}%)`)}
          title="Strong Areas"
          tone="bg-emerald-50 text-emerald-700"
        />
        <TopicList
          emptyText="Recommendations will update after practice."
          items={recommendedTopics}
          title="Recommended Today"
          tone="bg-blue-50 text-blue-700"
        />
      </div>
    </article>
  );
}

function TopicList({
  emptyText,
  items,
  title,
  tone
}: {
  emptyText: string;
  items: string[];
  title: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <span className={`rounded-full px-3 py-1.5 text-xs font-black ${tone}`} key={item}>
              {item}
            </span>
          ))
        ) : (
          <p className="text-sm text-slate-600">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function UpcomingTask({
  href,
  icon,
  title
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Link
      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
      href={href}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        {icon}
      </div>
      <h3 className="mt-4 font-black text-slate-950">{title}</h3>
      <p className="mt-2 inline-flex items-center gap-2 text-sm font-black text-blue-600">
        Start task <ArrowRight size={16} />
      </p>
    </Link>
  );
}

function buildTodayTasks(topics: string[], completed: number, dailyGoal: number) {
  const firstTopic = topics[0] ?? "Algebra";
  const secondTopic = topics[1] ?? "Grammar";

  return [
    { completed: completed >= 15, label: `15 ${firstTopic} Questions` },
    { completed: completed >= 25, label: `10 ${secondTopic} Questions` },
    { completed: false, label: "Complete Mini Test" },
    { completed: completed >= dailyGoal, label: "Review Incorrect Answers" }
  ];
}

function getDayStatus(date: Date, attempts: RecentAttempt[]) {
  if (isToday(date.toISOString())) {
    return "Today";
  }

  const hasAttempt = attempts.some((attempt) => isSameDay(new Date(attempt.date), date));

  if (hasAttempt) {
    return "Completed";
  }

  return date.getTime() > Date.now() ? "Upcoming" : "Upcoming";
}

function isThisWeek(date: string) {
  const now = new Date();
  const attemptDate = new Date(date);
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);

  return attemptDate >= start;
}

function isToday(date: string) {
  return isSameDay(new Date(date), new Date());
}

function isSameDay(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}
