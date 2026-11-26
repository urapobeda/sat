"use client";

import { ExternalLink, Pencil, PlayCircle, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { isHttpsUrl, lessonEndsAt, lessonStatus, type GroupLesson } from "@/lib/lessons";
import { lessonWriteError } from "@/lib/lessonErrors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { almatyInputToUtcIso, formatAlmaty, utcIsoToAlmatyInput } from "@/lib/timezone";
import { useGroupLessons } from "@/lib/useGroupLessons";

type Draft = {
  groupId: string; title: string; date: string; time: string; duration: string;
  meetingUrl: string; recordingUrl: string; notes: string; repeatWeeks: string;
};

const WEEK_MS = 7 * 24 * 60 * 60_000;
const input = "min-h-11 rounded-xl border border-slate-200 bg-transparent px-3";
const label = "flex min-w-0 flex-col gap-1 text-sm font-medium";

function emptyDraft(groupId = ""): Draft {
  const today = utcIsoToAlmatyInput(new Date().toISOString()).date;
  return { groupId, title: "", date: today, time: "19:00", duration: "90", meetingUrl: "", recordingUrl: "", notes: "", repeatWeeks: "1" };
}

function draftFromLesson(lesson: GroupLesson): Draft {
  const { date, time } = utcIsoToAlmatyInput(lesson.starts_at);
  return {
    groupId: lesson.group_id, title: lesson.title, date, time, duration: String(lesson.duration_minutes),
    meetingUrl: lesson.meeting_url ?? "", recordingUrl: lesson.recording_url ?? "", notes: lesson.notes ?? "", repeatWeeks: "1"
  };
}

export function TeacherSchedulePage() {
  const { data, error, loading, reload } = useGroupLessons();
  const groups = useMemo(() => (data?.groups ?? []).filter((group) => !group.archived), [data]);
  const groupName = useMemo(() => new Map((data?.groups ?? []).map((group) => [group.id, group.name])), [data]);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState("all");
  const [showPast, setShowPast] = useState(false);

  const groupId = draft.groupId || groups[0]?.id || "";
  const set = (key: keyof Draft) => (event: { target: { value: string } }) => setDraft((current) => ({ ...current, [key]: event.target.value }));

  const lessons = (data?.lessons ?? []).filter((lesson) => filter === "all" || lesson.group_id === filter);
  const now = new Date();
  const upcoming = lessons.filter((lesson) => lessonStatus(lesson, now) !== "past");
  const past = lessons.filter((lesson) => lessonStatus(lesson, now) === "past").reverse();

  function validate() {
    const startsAt = almatyInputToUtcIso(draft.date, draft.time);
    const duration = Number(draft.duration);
    const repeat = Number(draft.repeatWeeks);
    if (!groupId) return "Сначала создайте группу.";
    if (!draft.title.trim()) return "Введите тему урока.";
    if (!startsAt) return "Укажите дату и время.";
    if (!Number.isInteger(duration) || duration < 15 || duration > 480) return "Длительность — от 15 до 480 минут.";
    if (!Number.isInteger(repeat) || repeat < 1 || repeat > 26) return "Повтор — от 1 до 26 недель.";
    for (const url of [draft.meetingUrl, draft.recordingUrl]) if (url.trim() && !isHttpsUrl(url)) return "Ссылки должны начинаться с https://";
    return null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) { setMessage({ kind: "error", text: problem }); return; }
    setSaving(true); setMessage(null);
    const startsAt = almatyInputToUtcIso(draft.date, draft.time)!;
    const fields = {
      title: draft.title.trim(),
      duration_minutes: Number(draft.duration),
      meeting_url: draft.meetingUrl.trim() || null,
      recording_url: draft.recordingUrl.trim() || null,
      notes: draft.notes.trim() || null
    };
    const db = getSupabaseBrowserClient();
    try {
      if (editing) {
        const { error: failure } = await db.from("group_lessons").update({ ...fields, starts_at: startsAt }).eq("id", editing);
        if (failure) throw failure;
        setMessage({ kind: "ok", text: "Урок обновлён." });
      } else {
        const rows = Array.from({ length: Number(draft.repeatWeeks) }, (_, week) => ({
          ...fields, group_id: groupId, starts_at: new Date(new Date(startsAt).getTime() + week * WEEK_MS).toISOString()
        }));
        const { error: failure } = await db.from("group_lessons").insert(rows);
        if (failure) throw failure;
        setMessage({ kind: "ok", text: rows.length > 1 ? `Добавлено уроков: ${rows.length}.` : "Урок добавлен." });
      }
      setEditing(null);
      setDraft(emptyDraft(groupId));
      reload();
    } catch (failure) {
      setMessage({ kind: "error", text: lessonWriteError(failure, "Не удалось сохранить урок.") });
    } finally { setSaving(false); }
  }

  async function remove(lesson: GroupLesson) {
    if (!window.confirm(`Удалить урок «${lesson.title}» (${formatAlmaty(lesson.starts_at)})? Прикреплённые материалы останутся.`)) return;
    const { error: failure } = await getSupabaseBrowserClient().from("group_lessons").delete().eq("id", lesson.id);
    setMessage(failure ? { kind: "error", text: lessonWriteError(failure, "Не удалось удалить урок.") } : { kind: "ok", text: "Урок удалён." });
    if (editing === lesson.id) { setEditing(null); setDraft(emptyDraft(groupId)); }
    reload();
  }

  async function saveRecording(lesson: GroupLesson, url: string) {
    if (url.trim() && !isHttpsUrl(url)) { setMessage({ kind: "error", text: "Ссылка на запись должна начинаться с https://" }); return false; }
    const { error: failure } = await getSupabaseBrowserClient().from("group_lessons").update({ recording_url: url.trim() || null }).eq("id", lesson.id);
    setMessage(failure ? { kind: "error", text: lessonWriteError(failure, "Не удалось сохранить запись.") } : { kind: "ok", text: "Запись сохранена — ученики увидят её в «Lesson Recordings»." });
    reload();
    return !failure;
  }

  function startEdit(lesson: GroupLesson) {
    setEditing(lesson.id);
    setDraft(draftFromLesson(lesson));
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Расписание</h1>
        <p className="mt-2 text-sm text-slate-600">Уроки ваших групп. Время — Алматы (UTC+5). Ученики видят их в разделе «Schedule», записи — в «Lesson Recordings».</p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-rose-600">Не удалось загрузить расписание. Если вы только что обновили сайт, выполните миграцию add_lessons_and_materials.sql в Supabase. <button type="button" className="cursor-pointer underline" onClick={reload}>Повторить</button></p>
      ) : loading ? <p role="status">Загрузка…</p> : !groups.length ? (
        <div className="hub-card p-6 text-sm text-slate-600">Сначала создайте группу в разделе «Группы» — уроки назначаются группе.</div>
      ) : (
        <form onSubmit={submit} className="hub-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <h2 className="font-semibold sm:col-span-2 lg:col-span-4">{editing ? "Редактировать урок" : "Новый урок"}</h2>
          <label className={label}>Группа
            <select className={input} disabled={Boolean(editing)} value={groupId} onChange={set("groupId")}>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          <label className={`${label} sm:col-span-1 lg:col-span-3`}>Тема
            <input className={input} maxLength={150} required value={draft.title} onChange={set("title")} placeholder="Например, Inferences + Boundaries" />
          </label>
          <label className={label}>Дата<input className={input} required type="date" value={draft.date} onChange={set("date")} /></label>
          <label className={label}>Время<input className={input} required type="time" value={draft.time} onChange={set("time")} /></label>
          <label className={label}>Длительность, мин<input className={input} min={15} max={480} step={5} required type="number" value={draft.duration} onChange={set("duration")} /></label>
          {editing ? <span /> : (
            <label className={label}>Повторять, недель
              <input className={input} min={1} max={26} type="number" value={draft.repeatWeeks} onChange={set("repeatWeeks")} />
            </label>
          )}
          <label className={`${label} sm:col-span-2`}>Ссылка на урок (Zoom / Meet)
            <input className={input} inputMode="url" value={draft.meetingUrl} onChange={set("meetingUrl")} placeholder="https://meet.google.com/…" />
          </label>
          <label className={`${label} sm:col-span-2`}>Запись урока (YouTube / Drive)
            <input className={input} inputMode="url" value={draft.recordingUrl} onChange={set("recordingUrl")} placeholder="Можно добавить после урока" />
          </label>
          <label className={`${label} sm:col-span-2 lg:col-span-4`}>Заметка для учеников
            <textarea className={`${input} min-h-20 py-2`} maxLength={2000} value={draft.notes} onChange={set("notes")} placeholder="Что повторить, что взять с собой…" />
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
            <button className="hub-primary cursor-pointer disabled:opacity-50" disabled={saving} type="submit">
              {saving ? "Сохранение…" : editing ? "Сохранить изменения" : Number(draft.repeatWeeks) > 1 ? `Добавить ${draft.repeatWeeks} уроков` : "Добавить урок"}
            </button>
            {editing ? <button className="cursor-pointer text-sm underline" type="button" onClick={() => { setEditing(null); setDraft(emptyDraft(groupId)); }}>Отмена</button> : null}
          </div>
        </form>
      )}

      {message ? <p role={message.kind === "error" ? "alert" : "status"} className={`text-sm ${message.kind === "error" ? "text-rose-600" : "text-emerald-700"}`}>{message.text}</p> : null}

      {data && groups.length ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">Группа:
              <select className="min-h-9 rounded-lg border border-slate-200 bg-transparent px-2" value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">Все</option>
                {(data.groups).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </label>
          </div>

          <div className="hub-card p-4 sm:p-5">
            <h2 className="font-semibold">Ближайшие уроки · {upcoming.length}</h2>
            {upcoming.length ? <ul className="mt-2 divide-y divide-slate-100">{upcoming.map((lesson) => (
              <LessonItem key={lesson.id} lesson={lesson} group={groupName.get(lesson.group_id)} onEdit={startEdit} onDelete={remove} onRecording={saveRecording} />
            ))}</ul> : <p className="mt-2 text-sm text-slate-600">Запланированных уроков нет.</p>}
          </div>

          <div className="hub-card p-4 sm:p-5">
            <button className="flex w-full cursor-pointer items-center justify-between font-semibold" type="button" onClick={() => setShowPast((value) => !value)} aria-expanded={showPast}>
              <span>Прошедшие уроки · {past.length}</span><span className="text-sm font-normal text-slate-500">{showPast ? "Скрыть" : "Показать"}</span>
            </button>
            {showPast ? past.length ? <ul className="mt-2 divide-y divide-slate-100">{past.map((lesson) => (
              <LessonItem key={lesson.id} lesson={lesson} group={groupName.get(lesson.group_id)} onEdit={startEdit} onDelete={remove} onRecording={saveRecording} />
            ))}</ul> : <p className="mt-2 text-sm text-slate-600">Пока пусто.</p> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

function LessonItem({ lesson, group, onEdit, onDelete, onRecording }: {
  lesson: GroupLesson; group?: string;
  onEdit: (lesson: GroupLesson) => void;
  onDelete: (lesson: GroupLesson) => void;
  onRecording: (lesson: GroupLesson, url: string) => Promise<boolean>;
}) {
  const status = lessonStatus(lesson);
  const [recording, setRecording] = useState(lesson.recording_url ?? "");
  const [open, setOpen] = useState(false);
  const end = utcIsoToAlmatyInput(lessonEndsAt(lesson).toISOString()).time;
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{formatAlmaty(lesson.starts_at)}–{end}{status === "live" ? <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">идёт сейчас</span> : null}</p>
          <p className="break-words text-sm text-slate-800">{lesson.title}</p>
          <p className="text-xs text-slate-500">{group ?? "Группа"} · {lesson.duration_minutes} мин</p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {lesson.meeting_url ? <a className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100" href={lesson.meeting_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} aria-hidden="true" />Ссылка</a> : null}
          <button className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100" type="button" onClick={() => setOpen((value) => !value)}>
            <PlayCircle size={15} aria-hidden="true" />{lesson.recording_url ? "Запись ✓" : "Запись"}
          </button>
          <button aria-label="Редактировать" className="cursor-pointer rounded-lg p-1.5 hover:bg-slate-100" type="button" onClick={() => onEdit(lesson)}><Pencil size={15} /></button>
          <button aria-label="Удалить" className="cursor-pointer rounded-lg p-1.5 text-rose-600 hover:bg-rose-50" type="button" onClick={() => onDelete(lesson)}><Trash2 size={15} /></button>
        </div>
      </div>
      {open ? (
        <form className="mt-2 flex flex-wrap gap-2" onSubmit={async (event) => { event.preventDefault(); if (await onRecording(lesson, recording)) setOpen(false); }}>
          <input aria-label="Ссылка на запись" className="min-h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-2 text-sm" inputMode="url" placeholder="https://youtu.be/…" value={recording} onChange={(event) => setRecording(event.target.value)} />
          <button className="hub-primary cursor-pointer !min-h-9 !py-1 text-sm" type="submit">Сохранить</button>
        </form>
      ) : null}
    </li>
  );
}
