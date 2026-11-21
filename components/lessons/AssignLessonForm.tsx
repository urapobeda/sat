"use client";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { LessonPart, LessonRow } from "@/lib/lessons";
import { LESSON_PARTS, quickLessonDueDate } from "@/lib/lessons";
import { almatyInputToUtcIso, formatAlmaty } from "@/lib/timezone";
import { groupRequest } from "@/lib/groupApi";

export function AssignLessonForm({ lessons, initialId, onAssigned, onCancel }: { lessons: LessonRow[]; initialId: string; onAssigned: (id: string, count: number) => void; onCancel: () => void }) {
  const [lessonId, setLessonId] = useState(initialId);
  const [part, setPart] = useState<LessonPart>("homework");
  const [date, setDate] = useState(() => quickLessonDueDate(1));
  const [time, setTime] = useState("23:59");
  const [noDue, setNoDue] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const lesson = lessons.find(item => item.id === lessonId);
  const due = noDue ? null : almatyInputToUtcIso(date, time);
  async function assign(event: FormEvent) {
    event.preventDefault();
    if (!lesson || busy || (!noDue && !due)) { setError("Choose a lesson and a valid due date."); return; }
    setBusy(true); setError(null);
    const fingerprint = JSON.stringify({ lessonId, part, due, comment });
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
    try {
      const result = await groupRequest<{ id: string; studentCount: number }>(`/api/teacher/lessons/${lessonId}/assign`, "POST", { part, dueAt: due, comment, requestId: request.current.id });
      onAssigned(result.id, result.studentCount);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not assign homework."); }
    finally { setBusy(false); }
  }
  const field = "min-h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3";
  return <form className="hub-card space-y-5 p-5" onSubmit={event => void assign(event)}>
    <h2 className="hub-section-title">Assign homework</h2>
    <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
      <legend className="mb-3 font-medium">1. What to assign</legend>
      <label className="flex flex-col gap-1 text-sm">Lesson<select className={field} value={lessonId} onChange={event => setLessonId(event.target.value)}>{lessons.map(item => <option value={item.id} key={item.id}>{item.position}. {item.title}</option>)}</select></label>
      <label className="flex flex-col gap-1 text-sm">Part<select className={field} value={part} onChange={event => setPart(event.target.value as LessonPart)}>{Object.entries(LESSON_PARTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <p className="text-sm text-slate-500">The selected part must contain at least one question. Text blocks are included in the instructions.</p>
    </fieldset>
    <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
      <legend className="mb-3 font-medium">2. Due date and instructions</legend>
      <div className="flex flex-wrap gap-2">{[[1, "Tomorrow"], [3, "In 3 days"], [7, "In a week"]].map(([days, label]) => <button className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-3 text-sm" key={days} type="button" onClick={() => { setNoDue(false); setDate(quickLessonDueDate(Number(days))); setTime("23:59"); }}>{label}</button>)}<button className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-3 text-sm" aria-pressed={noDue} type="button" onClick={() => setNoDue(true)}>No due date</button></div>
      {!noDue ? <div className="grid gap-3 sm:grid-cols-2"><label className="flex flex-col gap-1 text-sm">Due date (Asia/Almaty)<input className={field} type="date" required value={date} onChange={event => setDate(event.target.value)} /></label><label className="flex flex-col gap-1 text-sm">Time<input className={field} type="time" required value={time} onChange={event => setTime(event.target.value)} /></label></div> : null}
      <label className="flex flex-col gap-1 text-sm">Comment for students<textarea className={`${field} min-h-24 py-2`} maxLength={5000} value={comment} onChange={event => setComment(event.target.value)} /></label>
    </fieldset>
    <p className="text-sm text-slate-600 [overflow-wrap:anywhere]">{lesson?.title} · {LESSON_PARTS[part]} → {lesson?.member_count ?? 0} students · {noDue ? "No due date" : due ? formatAlmaty(due) : "Choose a valid due date"}</p>
    {lesson?.member_count === 0 ? <p className="text-sm text-slate-600">Add students to this group before assigning homework.</p> : null}
    {error ? <p className="text-sm text-rose-600" role="alert">{error}</p> : null}
    <div className="flex flex-wrap gap-3"><button className="hub-primary min-h-11 cursor-pointer disabled:opacity-50" disabled={busy || !lesson?.member_count || (!noDue && !due)} type="submit">{busy ? "Assigning…" : `Assign · ${lesson?.member_count ?? 0} students`}</button><button className="min-h-11 cursor-pointer px-3 text-sm" type="button" disabled={busy} onClick={onCancel}>Cancel</button></div>
  </form>;
}
