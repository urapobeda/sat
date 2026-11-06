"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { lessons, type LessonRow } from "@/components/dashboard/scheduleData";
import { StudentShell } from "@/components/dashboard/StudentShell";

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getCalendarDays(viewDate: Date) {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function formatLessonDate(dateIso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(new Date(`${dateIso}T00:00:00`));
}

export function SchedulePage() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const lessonsByDate = useMemo(() => {
    const map = new Map<string, LessonRow[]>();

    for (const lesson of lessons) {
      const existing = map.get(lesson.date) ?? [];
      existing.push(lesson);
      map.set(lesson.date, existing);
    }

    return map;
  }, []);

  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);

  const monthLessons = useMemo(
    () =>
      lessons
        .filter((lesson) => {
          const lessonDate = new Date(`${lesson.date}T00:00:00`);
          return (
            lessonDate.getFullYear() === viewDate.getFullYear() &&
            lessonDate.getMonth() === viewDate.getMonth()
          );
        })
        .sort((a, b) => a.date.localeCompare(b.date)),
    [viewDate]
  );

  const upcoming = lessons.filter((lesson) => lesson.status === "upcoming");
  const completed = lessons.filter((lesson) => lesson.status === "completed");
  const nextLesson = upcoming[0];

  const summaryStats = [
    {
      label: "Next Lesson",
      value: nextLesson ? formatLessonDate(nextLesson.date) : "—"
    },
    { label: "Upcoming", value: String(upcoming.length) },
    { label: "Completed", value: String(completed.length) },
    { label: "Group", value: "SAT Group" }
  ];

  function goToPreviousMonth() {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  function goToToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <StudentShell active="schedule">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Schedule</h1>
          <p className="mt-2 text-base text-slate-600">
            Your upcoming and past lessons with your teacher.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {summaryStats.map((stat) => (
            <div
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
              key={stat.label}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {stat.label}
              </p>
              <p className="mt-1 truncate text-xl font-bold text-slate-950">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-950">
              {new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric"
              }).format(viewDate)}
            </h2>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={goToToday}
                type="button"
              >
                Today
              </button>
              <button
                aria-label="Previous month"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                onClick={goToPreviousMonth}
                type="button"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                aria-label="Next month"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                onClick={goToNextMonth}
                type="button"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
            {WEEKDAY_LABELS.map((label) => (
              <div
                className="bg-slate-50 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500"
                key={label}
              >
                {label}
              </div>
            ))}

            {calendarDays.map((day) => {
              const dayLessons = lessonsByDate.get(dateKey(day)) ?? [];
              const isCurrentMonth = day.getMonth() === viewDate.getMonth();
              const isToday = isSameDay(day, today);

              return (
                <div
                  className={[
                    "min-h-28 bg-white p-2 sm:min-h-32",
                    isCurrentMonth ? "" : "bg-slate-50/60"
                  ].join(" ")}
                  key={day.toISOString()}
                >
                  <span
                    className={[
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      isToday
                        ? "bg-blue-600 text-white"
                        : isCurrentMonth
                          ? "text-slate-700"
                          : "text-slate-300"
                    ].join(" ")}
                  >
                    {day.getDate()}
                  </span>

                  <div className="mt-1 space-y-1">
                    {dayLessons.map((lesson) => (
                      <div
                        className={[
                          "truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight",
                          lesson.status === "upcoming"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                        ].join(" ")}
                        key={lesson.date + lesson.topic}
                        title={`${lesson.time} · ${lesson.topic}`}
                      >
                        {lesson.time} {lesson.topic}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold text-slate-950">
            {new Intl.DateTimeFormat("en-US", {
              month: "long",
              year: "numeric"
            }).format(viewDate)}{" "}
            Lessons
          </h2>

          {monthLessons.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No lessons scheduled this month.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {monthLessons.map((lesson) => (
                <li
                  className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
                  key={lesson.date + lesson.topic}
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {formatLessonDate(lesson.date)} · {lesson.time}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {lesson.duration} · {lesson.group}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                      {lesson.topic}
                    </p>
                  </div>
                  {lesson.status === "upcoming" ? (
                    <button
                      className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
                      type="button"
                    >
                      Lesson link
                    </button>
                  ) : lesson.hasRecording ? (
                    <button
                      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 sm:w-auto"
                      type="button"
                    >
                      Watch recording
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </StudentShell>
  );
}
