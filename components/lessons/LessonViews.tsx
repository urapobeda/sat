"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { useLessons } from "@/components/lessons/useLessons";
import { LiveCourseBanner } from "@/components/live/LiveLessonLinks";
import { CourseTabs } from "@/components/course/CourseTabs";
import { formatLessonDate, lessonHomeworkStatus, LESSON_SECTIONS, LESSON_PARTS, quickLessonDueDate } from "@/lib/lessons";
import { formatAlmaty } from "@/lib/timezone";

function useLessonTime() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function LoadState({ state }: { state: ReturnType<typeof useLessons> }) {
  if (state.loading) return <p role="status">Loading lessons…</p>;
  if (state.signedOut) return <div className="hub-card p-5"><p>Sign in to view your lessons.</p><Link className="hub-primary mt-3" href="/auth">Sign in</Link></div>;
  if (state.error) return <p role="alert" className="text-sm text-rose-600">{state.error} <button className="cursor-pointer underline" type="button" onClick={state.reload}>Retry</button></p>;
  return null;
}
export function GroupLessons({ groupId }: { groupId: string }) {
  const state = useLessons(groupId);
  return <section className="hub-card space-y-4 p-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="hub-section-title">Course lessons</h2><Link className="hub-primary" href={`/teacher/lessons/new?groupId=${groupId}`}>Create lesson</Link></header>
    <LoadState state={state} />
    {!state.loading && !state.error && !state.signedOut ? state.lessons.length ? <ol className="divide-y divide-slate-200">{state.lessons.map(lesson => <li key={lesson.id} className="py-3">
      <Link className="hub-text-link font-medium [overflow-wrap:anywhere]" href={`/teacher/lessons/${lesson.id}`}>{lesson.position}. {lesson.title}</Link>
      <p className="mt-1 text-sm text-slate-600">{LESSON_SECTIONS[lesson.section]}{lesson.topic ? ` · ${lesson.topic}` : ""} · {formatLessonDate(lesson.starts_at)}</p>
    </li>)}</ol> : <p className="text-sm text-slate-600">No lessons yet. Create the first lesson for this group.</p> : null}
  </section>;
}
export function LessonListing({ state, schedule = false, staff = false }: { state: ReturnType<typeof useLessons>; schedule?: boolean; staff?: boolean }) {
  const now = useLessonTime();
  useEffect(() => {
    if (state.loading) return;
    const id = window.location.hash.slice(1);
    if (id.startsWith("lesson-")) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [state.loading, state.lessons]);
  const [groupId, setGroupId] = useState("");
  const groups = [...new Map(state.lessons.map(lesson => [lesson.group_id, lesson.group_name])).entries()];
  const visible = state.lessons.filter(lesson => !groupId || lesson.group_id === groupId);
  return <section className="space-y-5">
    {!staff && !schedule ? <LiveCourseBanner lessons={state.lessons} /> : null}
    <header><h1 className="text-3xl font-bold">{schedule ? "Schedule" : "Course plan"}</h1><p className="mt-2 text-slate-600">{schedule ? "Your scheduled group lessons. All times are shown in Asia/Almaty." : "Your group lessons, classwork, and homework in course order."}</p></header>
    <LoadState state={state} />
    {!state.loading && !state.error && !state.signedOut ? <>
      {state.homeworkError ? <p role="alert" className="text-sm text-slate-600">Lessons are available, but homework status could not be loaded. <button className="cursor-pointer underline" type="button" onClick={state.reload}>Retry</button></p> : null}
      {groups.length > 1 ? <label className="flex max-w-sm flex-col gap-1 text-sm">Group<select className="min-h-11 rounded-xl border border-slate-200 bg-transparent px-3" value={groupId} onChange={event => setGroupId(event.target.value)}><option value="">All groups</option>{groups.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label> : null}
      {!visible.length ? <div className="hub-card p-6 text-slate-600">{schedule ? "No lessons have been scheduled yet." : "No course lessons are available yet. Your teacher will add them here."}</div> : <div className="space-y-4">{visible.map(lesson => <article className="hub-card min-w-0 space-y-3 p-5" key={lesson.id} id={`lesson-${lesson.id}`}>
        <div><p className="text-sm text-slate-600 [overflow-wrap:anywhere]">{lesson.group_name} · {lesson.teacher_name}</p><h2 className="mt-1 text-xl font-semibold [overflow-wrap:anywhere]">{staff ? <Link className="hub-text-link" href={`/teacher/lessons/${lesson.id}`}>{lesson.position}. {lesson.title}</Link> : `${lesson.position}. ${lesson.title}`}</h2></div>
        <p className="text-sm text-slate-600">{LESSON_SECTIONS[lesson.section]}{lesson.topic ? ` · ${lesson.topic}` : ""} · {formatLessonDate(lesson.starts_at)}</p>
        {lesson.notes ? <p className="whitespace-pre-wrap text-sm text-slate-600 [overflow-wrap:anywhere]">{lesson.notes}</p> : null}
        {!staff && !state.homeworkError ? <div className="space-y-2 border-t border-slate-200 pt-3">{state.assignments.filter(item => item.lesson_id === lesson.id).length ? state.assignments.filter(item => item.lesson_id === lesson.id).map(item => <div className="flex min-w-0 flex-col justify-between gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center" key={item.id}>
          <div className="min-w-0 text-sm"><p className="font-medium [overflow-wrap:anywhere]">{item.title}</p><p className="mt-1 text-slate-600">{LESSON_PARTS[item.lesson_part]} · {lessonHomeworkStatus(item, now)} · {formatAlmaty(item.due_at)}</p></div>
          <Link className="hub-primary min-h-11 shrink-0 justify-center" href={`/homework/${item.id}`}>{item.status === "submitted" ? "View result" : item.status === "in_progress" ? "Continue" : "Start"}</Link>
        </div>) : <p className="text-sm text-slate-500">No homework assigned yet.</p>}</div> : null}
      </article>)}</div>}
    </> : null}
  </section>;
}
export function CoursePlanPage() {
  const state = useLessons();
  return <StudentShell active="course"><div className="min-w-0 space-y-5"><CourseTabs active="plan" /><LessonListing state={state} /></div></StudentShell>;
}
export function LessonSchedule({ staff = false }: { staff?: boolean }) {
  const state = useLessons(undefined, true);
  return <LessonCalendar state={state} staff={staff} />;
}
export function LessonCalendar({ state, staff = false }: { state: ReturnType<typeof useLessons>; staff?: boolean }) {
  const now = useLessonTime();
  const today = quickLessonDueDate(0, now);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [group, setGroup] = useState("");
  const first = new Date(`${month}-01T00:00:00Z`);
  const days = Array.from({ length: 42 }, (_, i) => new Date(first.getTime() + (i - first.getUTCDay()) * 86400000).toISOString().slice(0, 10));
  const groups = [...new Map(state.lessons.map(lesson => [lesson.group_id, lesson.group_name])).entries()];
  const rows = state.lessons.filter(lesson => !group || lesson.group_id === group);
  const calendarRows = rows.map(lesson => ({ lesson, day: quickLessonDueDate(0, Date.parse(lesson.starts_at!)) }));
  const monthRows = calendarRows.filter(row => row.day.startsWith(month));
  const monthName = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(first);
  const href = (id: string) => staff ? `/teacher/lessons/${id}` : `/course#lesson-${id}`;
  const move = (delta: number) => setMonth(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + delta, 1)).toISOString().slice(0, 7));
  const ready = !state.loading && !state.error && !state.signedOut;
  return <section className="min-w-0 space-y-6">
    <header><h1 className="text-3xl font-bold">Schedule</h1><p className="mt-2 text-slate-600">Your upcoming and past group lessons. All dates and times use Asia/Almaty.</p></header>
    <LoadState state={state} />
    {ready ? <>
      {!rows.length ? <div className="hub-card p-5 text-sm text-slate-600">No lessons have been scheduled yet.</div> : null}
      {groups.length > 1 ? <label className="flex max-w-sm flex-col gap-1 text-sm">Group<select className="min-h-11 rounded-xl border border-slate-200 bg-transparent px-3" value={group} onChange={event => setGroup(event.target.value)}><option value="">All groups</option>{groups.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label> : null}
      <div className="grid gap-3 sm:grid-cols-3">{[
        ["Upcoming", rows.filter(lesson => Date.parse(lesson.starts_at!) >= now).length],
        ["Past", rows.filter(lesson => Date.parse(lesson.starts_at!) < now).length],
        ["Groups", new Set(rows.map(lesson => lesson.group_id)).size]
      ].map(([label, value]) => <div className="hub-card p-4" key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}</div>
      <div className="hub-card min-w-0 p-3 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{monthName}</h2><div className="flex gap-2"><button className="min-h-11 cursor-pointer rounded-lg border border-slate-200 px-3 text-sm" type="button" onClick={() => setMonth(today.slice(0, 7))}>Today</button><button className="min-h-11 min-w-11 cursor-pointer rounded-lg border border-slate-200" aria-label="Previous month" type="button" onClick={() => move(-1)}>←</button><button className="min-h-11 min-w-11 cursor-pointer rounded-lg border border-slate-200" aria-label="Next month" type="button" onClick={() => move(1)}>→</button></div></div>
        <div className="mt-4 grid min-w-0 grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <div className="min-w-0 bg-slate-50 py-2 text-center text-xs text-slate-500" key={day}>{day}</div>)}
          {days.map(day => { const lessons = calendarRows.filter(row => row.day === day); return <div className={`min-h-20 min-w-0 p-1 sm:min-h-28 sm:p-2 ${day.startsWith(month) ? "bg-white" : "bg-slate-50"}`} key={day}>
            <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${day === today ? "bg-blue-600 text-white!" : "text-slate-600"}`}>{Number(day.slice(-2))}</span>
            {lessons.map(({ lesson }) => <Link key={lesson.id} className="mt-1 block truncate rounded bg-blue-50 px-1 py-1 text-xs text-blue-700" title={`${formatLessonDate(lesson.starts_at)} · ${lesson.title}`} aria-label={`${formatLessonDate(lesson.starts_at)} · ${lesson.title}`} href={href(lesson.id)}>{lesson.title}</Link>)}
          </div>; })}
        </div>
      </div>
      <div className="hub-card p-5"><h2 className="hub-section-title">{monthName} lessons</h2>{!monthRows.length ? <p className="mt-3 text-sm text-slate-600">No lessons scheduled this month.</p> : <ul className="mt-3 divide-y divide-slate-200">{monthRows.map(({ lesson }) => <li className="min-w-0 py-4" key={lesson.id}><Link className="hub-text-link font-medium [overflow-wrap:anywhere]" href={href(lesson.id)}>{lesson.title}</Link><p className="mt-1 text-sm text-slate-600">{formatLessonDate(lesson.starts_at)} · {lesson.group_name} · {lesson.teacher_name}</p>{lesson.topic ? <p className="mt-1 text-sm text-slate-500">{lesson.topic}</p> : null}</li>)}</ul>}</div>
    </> : null}
  </section>;
}
