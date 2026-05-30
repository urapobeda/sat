"use client";

import { BarChart3, CalendarDays, ClipboardList, Trash2, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import {
  clearProgressRecords,
  getProgressRecords,
  type ProgressRecord,
  subscribeToProgressUpdates
} from "@/lib/progress";

const sectionLabels = {
  all: "All",
  math: "Math",
  "reading-writing": "Reading and Writing"
};

const difficultyLabels = {
  all: "All",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard"
};

export function ProgressDashboard() {
  const [records, setRecords] = useState<ProgressRecord[]>([]);

  useEffect(() => {
    const refreshRecords = () => setRecords(getProgressRecords());

    window.queueMicrotask(refreshRecords);
    return subscribeToProgressUpdates(refreshRecords);
  }, []);

  const stats = useMemo(() => {
    const totalSessions = records.length;
    const averagePercentage =
      totalSessions > 0
        ? Math.round(
            records.reduce((sum, record) => sum + record.percentage, 0) /
              totalSessions
          )
        : 0;
    const bestResult =
      totalSessions > 0
        ? Math.max(...records.map((record) => record.percentage))
        : 0;
    const solvedQuestions = records.reduce((sum, record) => sum + record.total, 0);

    return {
      averagePercentage,
      bestResult,
      solvedQuestions,
      totalSessions
    };
  }, [records]);

  function handleClearProgress() {
    clearProgressRecords();
    setRecords([]);
  }

  if (records.length === 0) {
    return (
      <Card className="mt-10 min-h-80 hover:translate-y-0">
        <div className="flex min-h-64 flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-md border border-amber-100 bg-amber-50 text-amber-700">
            <BarChart3 size={26} />
          </div>
          <h2 className="mt-5 text-xl font-bold text-neutral-950">
            No progress yet
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-neutral-600">
            No progress yet. Start practicing to see your stats.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <section className="mt-10 space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          accent="text-teal-700"
          icon={<ClipboardList size={22} />}
          label="Total sessions"
          value={String(stats.totalSessions)}
        />
        <StatCard
          accent="text-violet-700"
          icon={<BarChart3 size={22} />}
          label="Average score"
          value={`${stats.averagePercentage}%`}
        />
        <StatCard
          accent="text-amber-700"
          icon={<Trophy size={22} />}
          label="Best result"
          value={`${stats.bestResult}%`}
        />
        <StatCard
          accent="text-neutral-900"
          icon={<CalendarDays size={22} />}
          label="Questions solved"
          value={String(stats.solvedQuestions)}
        />
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-amber-700">
            History
          </p>
          <h2 className="mt-1 text-2xl font-bold text-neutral-950">
            Recent attempts
          </h2>
        </div>
        <Button
          icon={<Trash2 size={18} />}
          onClick={handleClearProgress}
          variant="secondary"
        >
          Clear Progress
        </Button>
      </div>

      <div className="grid gap-4">
        {records.map((record) => (
          <AttemptCard key={record.id} record={record} />
        ))}
      </div>
    </section>
  );
}

type StatCardProps = {
  accent: string;
  icon: ReactNode;
  label: string;
  value: string;
};

function StatCard({ accent, icon, label, value }: StatCardProps) {
  return (
    <Card className="hover:translate-y-0">
      <div className={`flex h-11 w-11 items-center justify-center rounded-md bg-neutral-50 ${accent}`}>
        {icon}
      </div>
      <p className="mt-5 text-sm font-semibold text-neutral-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
    </Card>
  );
}

type AttemptCardProps = {
  record: ProgressRecord;
};

function AttemptCard({ record }: AttemptCardProps) {
  const isPractice = record.mode === "practice";
  const meta = isPractice
    ? `${sectionLabels[record.section]} / ${difficultyLabels[record.difficulty]}`
    : `Time spent: ${formatDuration(record.timeSpent)}`;

  return (
    <Card className="hover:translate-y-0">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                "rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-normal",
                isPractice
                  ? "border-teal-100 bg-teal-50 text-teal-700"
                  : "border-violet-100 bg-violet-50 text-violet-700"
              ].join(" ")}
            >
              {record.mode}
            </span>
            <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-600">
              {meta}
            </span>
          </div>
          <h3 className="mt-4 text-xl font-bold text-neutral-950">
            {record.score} of {record.total} correct
          </h3>
          <p className="mt-2 text-sm text-neutral-500">{formatDate(record.date)}</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-5 py-4 text-left md:text-right">
          <p className="text-xs font-semibold uppercase tracking-normal text-neutral-500">
            Percentage
          </p>
          <p className="mt-1 text-3xl font-bold text-neutral-950">
            {record.percentage}%
          </p>
        </div>
      </div>
    </Card>
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
