"use client";

import { BarChart3, CalendarDays, ClipboardList, Trash2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { StatTile } from "@/components/StatTile";
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
  const [records, setRecords] = useState<ProgressRecord[] | null>(null);

  useEffect(() => {
    const refreshRecords = () => setRecords(getProgressRecords());

    window.queueMicrotask(refreshRecords);
    return subscribeToProgressUpdates(refreshRecords);
  }, []);

  const stats = useMemo(() => {
    const loadedRecords = records ?? [];
    const totalSessions = loadedRecords.length;
    const averagePercentage =
      totalSessions > 0
        ? Math.round(
            loadedRecords.reduce((sum, record) => sum + record.percentage, 0) /
              totalSessions
          )
        : 0;
    const bestResult =
      totalSessions > 0
        ? Math.max(...loadedRecords.map((record) => record.percentage))
        : 0;
    const solvedQuestions = loadedRecords.reduce(
      (sum, record) => sum + record.total,
      0
    );

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

  if (records === null) {
    return (
      <Card className="mt-10 hover:translate-y-0">
        <div className="space-y-4">
          <div className="h-5 w-40 animate-pulse rounded bg-neutral-100" />
          <div className="h-10 w-full max-w-xl animate-pulse rounded bg-neutral-100" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                className="h-28 animate-pulse rounded-lg bg-neutral-100"
                key={item}
              />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <EmptyState
        description="No progress yet. Start practicing to see your stats."
        icon={<BarChart3 size={26} />}
        title="No progress yet"
      />
    );
  }

  return (
    <section className="mt-10 space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile
          icon={<ClipboardList size={22} />}
          label="Total sessions"
          tone="teal"
          value={String(stats.totalSessions)}
        />
        <StatTile
          icon={<BarChart3 size={22} />}
          label="Average score"
          tone="violet"
          value={`${stats.averagePercentage}%`}
        />
        <StatTile
          icon={<Trophy size={22} />}
          label="Best result"
          tone="amber"
          value={`${stats.bestResult}%`}
        />
        <StatTile
          icon={<CalendarDays size={22} />}
          label="Questions solved"
          tone="neutral"
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
          className="w-full sm:w-auto"
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
            <Badge
              className="uppercase tracking-normal"
              tone={isPractice ? "teal" : "violet"}
            >
              {record.mode}
            </Badge>
            <Badge>{meta}</Badge>
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
