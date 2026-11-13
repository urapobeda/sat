"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStudentAccount } from "@/components/dashboard/StudentAccount";
import { getSessionStreak } from "@/lib/sessionStreak";
import { getNextSATDate } from "@/lib/satDates";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getRecentPracticeAttempts, getRecentTestAttempts, mergeRecentAttempts, type RecentAttempt } from "@/lib/supabase/queries";

type Snapshot = {
  userId: string;
  practice: RecentAttempt[] | null;
  tests: RecentAttempt[] | null;
  plan: { target_score: number; exam_date: string } | null;
  planError: boolean;
};

const formatDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function LearningSnapshot() {
  const { userId, isLoading } = useStudentAccount();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [retry, setRetry] = useState(0);
  const [calendar, setCalendar] = useState<{ nextExam: Date | null; now: number; timeZone: string } | null>(null);

  useEffect(() => {
    const update = window.setTimeout(() => setCalendar({ nextExam: getNextSATDate(), now: Date.now(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }), 0);
    return () => window.clearTimeout(update);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const planRequest = getSupabaseBrowserClient().from("study_plans").select("target_score,exam_date").eq("user_id", userId).maybeSingle();
    void Promise.allSettled([
      getRecentPracticeAttempts(userId),
      getRecentTestAttempts(userId),
      planRequest
    ]).then(([practice, tests, plan]) => {
      if (!active) return;
      setSnapshot({
        userId,
        practice: practice.status === "fulfilled" ? practice.value : null,
        tests: tests.status === "fulfilled" ? tests.value : null,
        plan: plan.status === "fulfilled" ? plan.value.data : null,
        planError: plan.status === "rejected" || Boolean(plan.value.error)
      });
    });
    return () => { active = false; };
  }, [userId, retry]);

  const current = snapshot?.userId === userId ? snapshot : null;
  const pending = isLoading || Boolean(userId && !current);
  const attempts = mergeRecentAttempts(current?.practice ?? [], current?.tests ?? []);
  const unavailable = current ? [
    current.practice === null ? "practice history" : null,
    current.tests === null ? "test history" : null,
    current.planError ? "study plan" : null
  ].filter(Boolean) : [];
  const scored = attempts.filter((attempt) => attempt.mode === "test" && attempt.estimatedScore != null);
  const score = scored[0]?.estimatedScore;
  const previousScore = scored[1]?.estimatedScore;
  const change = score != null && previousScore != null ? score - previousScore : null;
  const exam = current?.plan ? new Date(`${current.plan.exam_date}T00:00:00`) : calendar?.nextExam;
  const days = exam && calendar ? Math.ceil((exam.getTime() - calendar.now) / 86_400_000) : null;

  const streak = current?.practice && current.tests && calendar ? getSessionStreak(attempts, calendar.now, calendar.timeZone) : null;

  return (
    <section aria-labelledby="learning-snapshot">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="hub-section-title" id="learning-snapshot">Learning snapshot</h2>
        <Link className="text-sm font-semibold hub-text-link hover:underline" href="/progress">Full progress</Link>
      </div>
      {unavailable.length > 0 ? (
        <p className="mb-3 text-sm text-slate-600" role="status">
          Could not load {unavailable.join(", ")}. <button className="cursor-pointer font-semibold text-blue-700 underline" onClick={() => setRetry((value) => value + 1)} type="button">Retry</button>
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Latest SAT estimate", value: score ?? "—", detail: change === null ? "Unofficial · based on a saved test" : `${change > 0 ? "+" : ""}${change} vs. previous test` },
          { label: "Target score", value: current?.plan?.target_score ?? "—", detail: "Set in your study plan" },
          { label: "Session streak", value: streak === null ? "—" : `${streak} ${streak === 1 ? "day" : "days"}`, detail: "From completed sessions" },
          { label: current?.plan ? "Your planned exam" : "Next listed SAT", value: exam ? formatDate.format(exam) : "—", detail: days === null ? "No upcoming date" : days < 0 ? "Update your planned date" : `${days} days to go` }
        ].map(({ label, value, detail }) => (
          <div className="hub-card p-4 sm:p-5" key={label}>
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className="my-1 text-2xl font-bold tabular-nums text-slate-950">{pending && label !== "Next listed SAT" ? "…" : value}</p>
            <p className="text-xs text-slate-600">{detail}</p>
          </div>
        ))}
      </div>
      <div className="hub-card mt-3 p-4 sm:p-5">
        <h3 className="font-semibold text-slate-950">Recent activity</h3>
        {pending ? <p className="mt-2 text-sm text-slate-600" role="status">Loading your activity…</p> : attempts.length ? (
          <ul className="mt-2 divide-y divide-slate-200">
            {attempts.slice(0, 3).map((attempt) => (
              <li className="flex flex-wrap justify-between gap-2 py-2.5 text-sm text-slate-700" key={attempt.id}>
                <span>{attempt.mode === "test" ? "Practice test" : attempt.topic || "Question Bank practice"} <span className="text-slate-500">· {formatDate.format(new Date(attempt.date))}</span></span>
                <span className="font-semibold">{attempt.score}/{attempt.total} correct</span>
              </li>
            ))}
          </ul>
        ) : (current?.practice === null || current?.tests === null) ? <p className="mt-2 text-sm text-slate-600">No completed sessions in the history that loaded.</p> : (
          <p className="mt-2 text-sm text-slate-600">{userId ? "Complete a practice session or test to see it here." : <> <Link className="font-semibold hub-text-link hover:underline" href="/auth">Sign in</Link> to track scores and practice across devices.</>}</p>
        )}
      </div>
    </section>
  );
}
