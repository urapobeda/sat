"use client";

import { CalendarDays, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  type CountdownTime,
  formatSATDate,
  formatSATTime,
  getCountdownTime,
  getNextSATDate,
  getSATCountdownBadge
} from "@/lib/satDates";

type SATCountdownProps = {
  compact?: boolean;
};

type CountdownState = {
  countdown: CountdownTime;
  nextSATDate: Date | null;
};

export function SATCountdown({ compact = false }: SATCountdownProps) {
  const [countdownState, setCountdownState] = useState<CountdownState | null>(
    null
  );

  useEffect(() => {
    function updateCountdown() {
      const nextDate = getNextSATDate();
      setCountdownState({
        countdown: getCountdownTime(nextDate),
        nextSATDate: nextDate
      });
    }

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);
  }, []);

  if (!countdownState) {
    return <SATCountdownLoading compact={compact} />;
  }

  const { countdown, nextSATDate } = countdownState;

  if (!nextSATDate) {
    return (
      <article
        className={[
          "rounded-3xl border border-slate-200 bg-white shadow-sm",
          compact ? "p-4" : "p-5"
        ].join(" ")}
      >
        <p className="text-sm font-black uppercase tracking-[0.12em] text-blue-600">
          Next Digital SAT
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Schedule coming soon
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Add future SAT dates in `lib/satDates.ts` and this countdown will
          continue automatically.
        </p>
      </article>
    );
  }

  const badge = getSATCountdownBadge(countdown.days);

  return (
    <article
      className={[
        "relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-violet-50/60 shadow-sm",
        compact ? "p-4" : "p-5 sm:p-6"
      ].join(" ")}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-violet-500 to-emerald-400" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span
            className={[
              "inline-flex rounded-full px-3 py-1 text-xs font-black",
              badge === "Final Week"
                ? "bg-rose-50 text-rose-700"
                : badge === "Less than 30 Days"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-blue-50 text-blue-700"
            ].join(" ")}
          >
            {badge}
          </span>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.12em] text-blue-600">
            Next Digital SAT
          </p>
          <h2
            className={[
              "mt-2 font-black text-slate-950",
              compact ? "text-xl" : "text-2xl"
            ].join(" ")}
          >
            {formatSATDate(nextSATDate)}
          </h2>
          <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-slate-600">
            <Clock3 size={17} />
            {formatSATTime(nextSATDate)}
          </p>
        </div>

        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
          <CalendarDays size={28} />
        </div>
      </div>

      <div
        className={[
          "grid grid-cols-2 gap-3 sm:grid-cols-4",
          compact ? "mt-4" : "mt-6"
        ].join(" ")}
      >
        <TimeBlock label="Days" value={countdown.days} />
        <TimeBlock label="Hours" value={countdown.hours} />
        <TimeBlock label="Minutes" value={countdown.minutes} />
        <TimeBlock label="Seconds" value={countdown.seconds} />
      </div>
    </article>
  );
}

function SATCountdownLoading({ compact }: { compact: boolean }) {
  return (
    <article
      className={[
        "relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-violet-50/60 shadow-sm",
        compact ? "p-4" : "p-5 sm:p-6"
      ].join(" ")}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-violet-500 to-emerald-400" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            Upcoming Exam
          </span>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.12em] text-blue-600">
            Next Digital SAT
          </p>
          <div className="mt-2 h-8 w-64 max-w-full animate-pulse rounded-xl bg-white/80" />
          <div className="mt-3 h-5 w-24 animate-pulse rounded-lg bg-white/80" />
        </div>

        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
          <CalendarDays size={28} />
        </div>
      </div>

      <div
        className={[
          "grid grid-cols-2 gap-3 sm:grid-cols-4",
          compact ? "mt-4" : "mt-6"
        ].join(" ")}
      >
        <TimeBlock label="Days" value="--" />
        <TimeBlock label="Hours" value="--" />
        <TimeBlock label="Minutes" value="--" />
        <TimeBlock label="Seconds" value="--" />
      </div>
    </article>
  );
}

function TimeBlock({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 text-center shadow-sm">
      <p className="text-3xl font-black tabular-nums text-slate-950">
        {typeof value === "number" ? String(value).padStart(2, "0") : value}
      </p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
    </div>
  );
}
