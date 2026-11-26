"use client";

import { ChevronLeft, ChevronRight, ExternalLink, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { lessonEndsAt, lessonStatus, type GroupLesson } from "@/lib/lessons";
import { utcIsoToAlmatyInput } from "@/lib/timezone";
import { useGroupLessons } from "@/lib/useGroupLessons";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

/** Lessons are shown in Almaty time, whatever the device clock says. */
function lessonDay(lesson: GroupLesson) {
  return utcIsoToAlmatyInput(lesson.starts_at).date;
}

function lessonTime(lesson: GroupLesson) {
  return `${utcIsoToAlmatyInput(lesson.starts_at).time}–${utcIsoToAlmatyInput(lessonEndsAt(lesson).toISOString()).time}`;
}

function formatDay(day: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${day}T00:00:00Z`));
}

const monthTitle = (date: Date) => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);

export function SchedulePage() {
  const { data, error, loading, signedIn, reload } = useGroupLessons();
  const todayKey = utcIsoToAlmatyInput(new Date().toISOString()).date;
  const [todayYear, todayMonth] = todayKey.split("-").map(Number);
  const [viewDate, setViewDate] = useState(() => new Date(todayYear, todayMonth - 1, 1));

  const lessons = useMemo(() => data?.lessons ?? [], [data]);
  const groupName = useMemo(() => new Map((data?.groups ?? []).map((group) => [group.id, group.name])), [data]);
  const lessonsByDate = useMemo(() => {
    const map = new Map<string, GroupLesson[]>();
    for (const lesson of lessons) map.set(lessonDay(lesson), [...(map.get(lessonDay(lesson)) ?? []), lesson]);
    return map;
  }, [lessons]);
  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);
  const monthPrefix = dateKey(viewDate).slice(0, 7);
  const monthLessons = lessons.filter((lesson) => lessonDay(lesson).startsWith(monthPrefix));

  const now = new Date();
  const upcoming = lessons.filter((lesson) => lessonStatus(lesson, now) !== "past");
  const completed = lessons.length - upcoming.length;
  const nextLesson = upcoming[0];
  const groups = data?.groups.filter((group) => !group.archived) ?? [];

  const summaryStats = [
    { label: "Next lesson", value: nextLesson ? `${formatDay(lessonDay(nextLesson))}, ${utcIsoToAlmatyInput(nextLesson.starts_at).time}` : "—" },
    { label: "Upcoming", value: String(upcoming.length) },
    { label: "Completed", value: String(completed) },
    { label: groups.length > 1 ? "Groups" : "Group", value: groups.length ? groups.map((group) => group.name).join(", ") : "—" }
  ];

  const shiftMonth = (delta: number) => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  return (
    <StudentShell active="schedule">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Schedule</h1>
          <p className="mt-2 text-base text-slate-600">Your lessons with your teacher. Times are Almaty time (UTC+5).</p>
        </div>

        {!signedIn && !loading ? (
          <p className="hub-card p-5 text-sm text-slate-600"><Link className="hub-text-link underline" href="/auth">Sign in</Link> to see your lessons.</p>
        ) : error ? (
          <p className="hub-card p-5 text-sm text-rose-600" role="alert">Could not load the schedule. <button className="cursor-pointer underline" onClick={reload} type="button">Try again</button></p>
        ) : loading ? (
          <p className="hub-card p-5 text-sm text-slate-600" role="status">Loading schedule…</p>
        ) : (
          <>
            {!data?.groups.length ? (
              <p className="hub-card p-5 text-sm text-slate-600">You have not joined a group yet. Enter your teacher&apos;s code from the account menu, and the lessons will appear here.</p>
            ) : null}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {summaryStats.map((stat) => (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm" key={stat.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{stat.label}</p>
                  <p className="mt-1 truncate text-xl font-bold text-slate-950" title={stat.value}>{stat.value}</p>
                </div>
              ))}
            </div>

            {nextLesson ? <LessonRow lesson={nextLesson} group={groupName.get(nextLesson.group_id)} highlight /> : null}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-950">{monthTitle(viewDate)}</h2>
                <div className="flex items-center gap-2">
                  <button className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => setViewDate(new Date(todayYear, todayMonth - 1, 1))} type="button">Today</button>
                  <button aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50" onClick={() => shiftMonth(-1)} type="button"><ChevronLeft size={16} /></button>
                  <button aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50" onClick={() => shiftMonth(1)} type="button"><ChevronRight size={16} /></button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
                {WEEKDAY_LABELS.map((label) => (
                  <div className="bg-slate-50 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500" key={label}>{label}</div>
                ))}
                {calendarDays.map((day) => {
                  const key = dateKey(day);
                  const dayLessons = lessonsByDate.get(key) ?? [];
                  const isCurrentMonth = day.getMonth() === viewDate.getMonth();
                  return (
                    <div className={["min-h-20 bg-white p-1.5 sm:min-h-28 sm:p-2", isCurrentMonth ? "" : "bg-slate-50/60"].join(" ")} key={key}>
                      <span className={["inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", key === todayKey ? "bg-blue-600 text-white" : isCurrentMonth ? "text-slate-700" : "text-slate-300"].join(" ")}>{day.getDate()}</span>
                      <div className="mt-1 space-y-1">
                        {dayLessons.map((lesson) => (
                          <div className={["truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight", lessonStatus(lesson, now) === "past" ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-700"].join(" ")} key={lesson.id} title={`${lessonTime(lesson)} · ${lesson.title}`}>
                            {utcIsoToAlmatyInput(lesson.starts_at).time} {lesson.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-slate-950">{monthTitle(viewDate)} lessons</h2>
              {monthLessons.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No lessons scheduled this month.</p>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100">
                  {monthLessons.map((lesson) => <li key={lesson.id}><LessonRow lesson={lesson} group={groupName.get(lesson.group_id)} /></li>)}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </StudentShell>
  );
}

function LessonRow({ lesson, group, highlight = false }: { lesson: GroupLesson; group?: string; highlight?: boolean }) {
  const status = lessonStatus(lesson);
  const body = (
    <div className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        {highlight ? <p className="hub-eyebrow mb-1">{status === "live" ? "Happening now" : "Next lesson"}</p> : null}
        <p className="font-semibold text-slate-900">{formatDay(lessonDay(lesson))} · {lessonTime(lesson)}</p>
        <p className="mt-0.5 text-xs text-slate-500">{lesson.duration_minutes} min{group ? ` · ${group}` : ""}</p>
        <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-800">{lesson.title}</p>
        {lesson.notes ? <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">{lesson.notes}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {status !== "past" && lesson.meeting_url ? (
          <a className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700" href={lesson.meeting_url} rel="noopener noreferrer" target="_blank">
            {status === "live" ? "Join now" : "Lesson link"}<ExternalLink aria-hidden="true" size={14} />
          </a>
        ) : null}
        {lesson.recording_url ? (
          <a className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50" href={lesson.recording_url} rel="noopener noreferrer" target="_blank">
            <PlayCircle aria-hidden="true" size={14} />Watch recording
          </a>
        ) : null}
      </div>
    </div>
  );
  return highlight ? <section className="rounded-3xl border border-blue-200 bg-white px-6 shadow-sm sm:px-8">{body}</section> : body;
}
