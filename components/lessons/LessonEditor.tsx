"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { QuestionPicker } from "@/components/homework/QuestionPicker";
import { AssignLessonForm } from "@/components/lessons/AssignLessonForm";
import { groupRequest } from "@/lib/groupApi";
import type { StudyGroup } from "@/lib/groups";
import { LESSON_PARTS, LESSON_SECTIONS, type Lesson, type LessonItem, type LessonPart, type LessonSection, type CourseData } from "@/lib/lessons";
import { almatyInputToUtcIso, utcIsoToAlmatyInput } from "@/lib/timezone";

type Content = { questions: string[]; blocks: { title: string; body: string }[] };
type Draft = { title: string; section: LessonSection; topic: string; date: string; time: string; position: number; notes: string; classwork: Content; homework: Content };
const blank = (): Draft => ({ title: "", section: "general", topic: "", date: "", time: "09:00", position: 1, notes: "", classwork: { questions: [], blocks: [] }, homework: { questions: [], blocks: [] } });

export function LessonEditor({ lessonId, initialGroupId }: { lessonId?: string; initialGroupId?: string }) {
  const router = useRouter();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [saved, setSaved] = useState("");
  const [lessons, setLessons] = useState<CourseData["lessons"]>([]);
  const [part, setPart] = useState<LessonPart>("classwork");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; assignment?: string } | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(null);
      try {
        let next = blank(), currentGroup: StudyGroup;
        if (lessonId) {
          const result = await groupRequest<{ lesson: Lesson; items: LessonItem[]; group: StudyGroup }>(`/api/lessons/${lessonId}`, "GET", undefined, controller.signal);
          if (!result.group) throw new Error("Group unavailable.");
          currentGroup = result.group;
          const date = utcIsoToAlmatyInput(result.lesson.starts_at);
          next = { ...next, title: result.lesson.title, section: result.lesson.section, topic: result.lesson.topic, position: result.lesson.position, date: date.date, time: date.time, notes: result.lesson.notes };
          for (const item of result.items) {
            if (item.question_id) next[item.part].questions.push(item.question_id);
            else next[item.part].blocks.push({ title: item.title ?? "", body: item.body ?? "" });
          }
        } else {
          const result = await groupRequest<{ group: StudyGroup }>(`/api/teacher/groups/${initialGroupId}`, "GET", undefined, controller.signal);
          currentGroup = result.group;
        }
        const course = await groupRequest<CourseData>(`/api/lessons?groupId=${currentGroup.id}`, "GET", undefined, controller.signal);
        if (!lessonId) next.position = Math.max(0, ...course.lessons.map(item => item.position)) + 1;
        if (!controller.signal.aborted) { setGroup(currentGroup); setLessons(course.lessons); setDraft(next); setSaved(JSON.stringify(next)); }
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load the lesson."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [lessonId, initialGroupId, retry]);
  const dirty = JSON.stringify(draft) !== saved;
  const content = draft[part];
  function setContent(next: Content) { setDraft(value => ({ ...value, [part]: next })); }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!group || busy) return;
    const startsAt = draft.date ? almatyInputToUtcIso(draft.date, draft.time) : null;
    if (draft.date && !startsAt) { setError("Choose a valid lesson date and time."); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      const items = (["classwork", "homework"] as const).flatMap(part => [
        ...draft[part].questions.map(questionId => ({ kind: "question", part, questionId })),
        ...draft[part].blocks.map(block => ({ kind: "text", part, ...block }))
      ]);
      const body = { groupId: group.id, title: draft.title, section: draft.section, topic: draft.topic, startsAt, position: draft.position, notes: draft.notes, items };
      const result = await groupRequest<{ id: string }>(lessonId ? `/api/teacher/lessons/${lessonId}` : "/api/teacher/lessons", lessonId ? "PATCH" : "POST", body);
      if (!lessonId) router.replace(`/teacher/lessons/${result.id}`);
      else { setNotice({ text: "Lesson saved." }); setRetry(value => value + 1); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save the lesson."); }
    finally { setBusy(false); }
  }
  const input = "min-h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3";
  return <section className="space-y-5">
    <Link className="hub-text-link text-sm" href={group ? `/teacher/groups/${group.id}` : "/teacher/groups"}>← Back to group</Link>
    <h1 className="text-3xl font-bold">{lessonId ? "Edit lesson" : "Create lesson"}</h1>
    {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice.text} {notice.assignment ? <Link className="underline" href={`/teacher/homework/${notice.assignment}`}>Open assignment</Link> : null}</p> : null}
    {error ? <p role="alert" className="text-sm text-rose-600">{error} {loading || group ? null : <button type="button" className="cursor-pointer underline" onClick={() => setRetry(value => value + 1)}>Retry</button>}</p> : null}
    {loading ? <p role="status">Loading lesson…</p> : group ? <>
      <p className="text-sm text-slate-600">{group.name} · {group.member_count} students</p>
      {assigning && lessonId ? <AssignLessonForm lessons={lessons} initialId={lessonId} onCancel={() => setAssigning(false)} onAssigned={(id, count) => { setAssigning(false); setNotice({ text: `Assigned to ${count} students.`, assignment: id }); }} /> : null}
      <form className="space-y-5" onSubmit={event => void save(event)}>
        <fieldset disabled={busy || assigning} className="hub-card grid gap-4 p-5 disabled:opacity-60 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">Title<input className={input} maxLength={200} required value={draft.title} onChange={event => setDraft(value => ({ ...value, title: event.target.value }))} /></label>
          <label className="flex flex-col gap-1 text-sm">Section<select className={input} value={draft.section} onChange={event => setDraft(value => ({ ...value, section: event.target.value as LessonSection }))}>{Object.entries(LESSON_SECTIONS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-sm">Topic<input className={input} maxLength={200} value={draft.topic} onChange={event => setDraft(value => ({ ...value, topic: event.target.value }))} /></label>
          <label className="flex flex-col gap-1 text-sm">Course position<input className={input} type="number" required min={1} max={100000} value={draft.position} onChange={event => setDraft(value => ({ ...value, position: Number(event.target.value) }))} /></label>
          <label className="flex flex-col gap-1 text-sm">Lesson date (Asia/Almaty; optional)<input className={input} type="date" value={draft.date} onChange={event => setDraft(value => ({ ...value, date: event.target.value }))} /></label>
          <label className="flex flex-col gap-1 text-sm">Lesson time<input className={input} type="time" required={Boolean(draft.date)} value={draft.time} onChange={event => setDraft(value => ({ ...value, time: event.target.value }))} /></label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">Notes for students<textarea className={`${input} min-h-24 py-2`} maxLength={5000} value={draft.notes} onChange={event => setDraft(value => ({ ...value, notes: event.target.value }))} /></label>
        </fieldset>
        <section className="hub-card min-w-0 space-y-4 p-5">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Lesson part">{(["classwork", "homework"] as const).map(id => <button className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 text-sm aria-pressed:border-blue-600 aria-pressed:text-blue-600" aria-pressed={part === id} key={id} type="button" onClick={() => setPart(id)}>{LESSON_PARTS[id]} · {draft[id].questions.length} questions</button>)}</div>
          <fieldset disabled={busy || assigning} className="min-w-0 space-y-4 disabled:opacity-60">
            <QuestionPicker key={`${part}:${draft.section}`} initialSection={draft.section === "reading_writing" ? "reading-writing" : "math"} selectedIds={content.questions} onChange={questions => setContent({ ...content, questions })} />
            <h2 className="hub-section-title">Text blocks</h2>
            {content.blocks.map((block, index) => <div className="space-y-3 rounded-xl border border-slate-200 p-3" key={index}>
              <label className="flex flex-col gap-1 text-sm">Block title<input className={input} maxLength={200} value={block.title} onChange={event => setContent({ ...content, blocks: content.blocks.map((item, i) => i === index ? { ...item, title: event.target.value } : item) })} /></label>
              <label className="flex flex-col gap-1 text-sm">Text<textarea className={`${input} min-h-24 py-2`} maxLength={5000} value={block.body} onChange={event => setContent({ ...content, blocks: content.blocks.map((item, i) => i === index ? { ...item, body: event.target.value } : item) })} /></label>
              <button className="min-h-11 cursor-pointer text-sm text-rose-600" type="button" onClick={() => setContent({ ...content, blocks: content.blocks.filter((_, i) => i !== index) })}>Remove block</button>
            </div>)}
            <button className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-3 text-sm" type="button" disabled={content.blocks.length >= 100} onClick={() => setContent({ ...content, blocks: [...content.blocks, { title: "", body: "" }] })}>Add text block</button>
          </fieldset>
        </section>
        <div className="flex flex-wrap items-center gap-3"><button className="hub-primary min-h-11 cursor-pointer disabled:opacity-50" type="submit" disabled={busy || assigning || (!dirty && Boolean(lessonId))}>{busy ? "Saving…" : "Save lesson"}</button>{lessonId ? <button className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 text-sm disabled:opacity-50" type="button" disabled={dirty || busy || assigning || group.archived} onClick={() => setAssigning(true)}>Assign homework</button> : null}{lessonId && dirty ? <span className="text-sm text-slate-500">Save your changes before assigning homework.</span> : null}</div>
      </form>
    </> : null}
  </section>;
}
