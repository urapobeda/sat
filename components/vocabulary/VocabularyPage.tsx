"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { useStudentAccount } from "@/components/dashboard/StudentAccount";
import { groupRequest } from "@/lib/groupApi";
import type { StudyGroup } from "@/lib/groups";
import type { LessonRow } from "@/lib/lessons";
import type { VocabularyWord } from "@/lib/vocabulary";

type Data = { words: VocabularyWord[]; groups?: StudyGroup[]; lessons?: LessonRow[]; userId?: string };
const input = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900";
const primary = "min-h-11 cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-default disabled:opacity-50";
const secondary = "min-h-11 cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50";
const emptyDraft = { word: "", partOfSpeech: "", definitionEn: "", translationRu: "", example: "", groupId: "", lessonId: "" };
export function VocabularyPage({ staff = false }: { staff?: boolean }) {
  return staff ? <VocabularyContent staff /> : <StudentShell active="vocabulary"><VocabularyContent staff={false} /></StudentShell>;
}
function VocabularyContent({ staff }: { staff: boolean }) {
  const { userId, isLoading } = useStudentAccount();
  const [loaded, setLoaded] = useState<{ owner: string; data: Data } | null>(null);
  const [failure, setFailure] = useState<{ owner: string; message: string } | null>(null);
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState(""); const [lessonFilter, setLessonFilter] = useState("");
  const [draft, setDraft] = useState(emptyDraft); const [editId, setEditId] = useState<string | null>(null);
  const [bulk, setBulk] = useState({ text: "", groupId: "", lessonId: "" });
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const account = useRef(userId);
  useEffect(() => { account.current = userId; }, [userId]);
  useEffect(() => {
    if (!userId || isLoading) return;
    let active = true;
    groupRequest<Data>(`/api/vocabulary${staff ? "?context=1" : ""}`, "GET", undefined, AbortSignal.timeout(15000))
      .then(data => { if (active) { setLoaded({ owner: userId, data }); setFailure(null); } })
      .catch(error => { if (active) setFailure({ owner: userId, message: error instanceof Error ? error.message : "Vocabulary could not be loaded." }); });
    return () => { active = false; };
  }, [staff, userId, isLoading, reload]);
  const data = loaded?.owner === userId ? loaded?.data : undefined;
  const error = failure?.owner === userId ? failure?.message : null;
  const words = useMemo(() => (data?.words ?? []).filter(word =>
    (!lessonFilter || (lessonFilter === "none" ? !word.lesson_id : word.lesson_id === lessonFilter)) &&
    `${word.word} ${word.definition_en} ${word.translation_ru}`.toLowerCase().includes(query.trim().toLowerCase())), [data, lessonFilter, query]);
  const lessons = data?.lessons ?? [];
  const filterLessons = staff ? lessons : [...new Map((data?.words ?? []).flatMap(word => word.lesson_id && word.lesson_title ? [[word.lesson_id, { id: word.lesson_id, title: word.lesson_title, group_name: word.group_name }]] as const : [])).values()];
  const lessonOptions = (groupId: string, author = userId) => lessons.filter(lesson => groupId ? lesson.group_id === groupId : data?.groups?.some(group => group.id === lesson.group_id && group.teacher_id === author));
  async function mutate(action: () => Promise<unknown>, success: string, clear?: () => void) {
    const owner = userId; setBusy(true); setMessage("");
    try {
      await action();
      if (account.current === owner) { clear?.(); if (success) setMessage(success); setReload(r => r + 1); }
    } catch (error) { if (account.current === owner) setMessage(error instanceof Error ? error.message : "The change could not be saved."); }
    finally { setBusy(false); }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    void mutate(() => groupRequest(`/api/teacher/vocabulary${editId ? `/${editId}` : ""}`, editId ? "PATCH" : "POST", { ...draft, groupId: draft.groupId || null, lessonId: draft.lessonId || null }), "Word saved.", () => { setDraft(emptyDraft); setEditId(null); });
  }
  async function importWords(event: FormEvent) {
    event.preventDefault();
    await mutate(async () => {
      const result = await groupRequest<{ inserted: number; skipped: number }>("/api/teacher/vocabulary/bulk", "POST", { ...bulk, groupId: bulk.groupId || null, lessonId: bulk.lessonId || null });
      // Report counts from the database, including existing words skipped by the unique index.
      if (account.current === userId) { setBulk(old => ({ ...old, text: "" })); setMessage(`${result.inserted} words imported; ${result.skipped} existing words skipped.`); }
    }, "");
  }
  const editingAuthor = data?.words.find(word => word.id === editId)?.created_by ?? userId;
  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-7">
    <header><h1 className="text-3xl font-bold">Vocabulary</h1><p className="mt-2 text-slate-500">{staff ? "Build your course vocabulary and share it with your groups." : "Words from your teachers and groups. Select one word in Reading & Writing practice or homework to look it up."}</p></header>
    {isLoading ? <p role="status">Loading your account…</p> : !userId ? <p><Link className="text-blue-600 underline" href="/auth?next=/vocabulary">Sign in</Link> to view your course vocabulary.</p> : <>
      {error ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4">{error} <button className={secondary} type="button" onClick={() => setReload(r => r + 1)}>Retry</button></p> : !data ? <p role="status">Loading vocabulary…</p> : null}
      {message ? <p role="status" className="rounded-xl bg-blue-50 p-4 text-sm text-slate-700">{message}</p> : null}
      {staff && data ? <>
        <form ref={form} onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">{editId ? "Edit word" : "Add word"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">Word<input className={input} value={draft.word} required maxLength={100} onChange={e => setDraft({ ...draft, word: e.target.value })} /></label>
            <label className="space-y-1 text-sm">Part of speech<input className={input} value={draft.partOfSpeech} maxLength={80} placeholder="e.g. verb" onChange={e => setDraft({ ...draft, partOfSpeech: e.target.value })} /></label>
            <label className="space-y-1 text-sm">English definition<textarea className={input} value={draft.definitionEn} required maxLength={4000} onChange={e => setDraft({ ...draft, definitionEn: e.target.value })} /></label>
            <label className="space-y-1 text-sm">Russian translation<textarea className={input} value={draft.translationRu} required maxLength={1000} onChange={e => setDraft({ ...draft, translationRu: e.target.value })} /></label>
            <label className="space-y-1 text-sm">Vocabulary<select className={input} value={draft.groupId} onChange={e => setDraft({ ...draft, groupId: e.target.value, lessonId: "" })}><option value="">Common · all of this teacher’s groups</option>{data.groups?.map(group => <option key={group.id} value={group.id}>{group.name}{group.archived ? " (archived)" : ""}</option>)}</select></label>
            <label className="space-y-1 text-sm">Lesson<select className={input} value={draft.lessonId} onChange={e => setDraft({ ...draft, lessonId: e.target.value })}><option value="">No lesson</option>{lessonOptions(draft.groupId, editingAuthor).map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.group_name} · {lesson.title}</option>)}</select></label>
          </div>
          <label className="block space-y-1 text-sm">Example sentence<textarea className={input} value={draft.example} maxLength={4000} onChange={e => setDraft({ ...draft, example: e.target.value })} /></label>
          <div className="flex flex-wrap gap-2"><button className={primary} disabled={busy} type="submit">{busy ? "Saving…" : "Save word"}</button>{editId ? <button className={secondary} disabled={busy} type="button" onClick={() => { setEditId(null); setDraft(emptyDraft); }}>Cancel edit</button> : null}</div>
        </form>
        <details className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-semibold">Import multiple words</summary><form onSubmit={importWords} className="mt-4 space-y-4">
          <p className="text-sm text-slate-500">One line per word: word — translation — definition. Up to 500 words. Existing words are skipped.</p>
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm">Vocabulary<select className={input} value={bulk.groupId} onChange={e => setBulk({ ...bulk, groupId: e.target.value, lessonId: "" })}><option value="">Common · all of your groups</option>{data.groups?.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><label className="space-y-1 text-sm">Lesson<select className={input} value={bulk.lessonId} onChange={e => setBulk({ ...bulk, lessonId: e.target.value })}><option value="">No lesson</option>{lessonOptions(bulk.groupId).map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.group_name} · {lesson.title}</option>)}</select></label></div>
          <label className="block space-y-1 text-sm">Words<textarea className={`${input} min-h-40`} required maxLength={250000} value={bulk.text} placeholder="word — translation — English definition" onChange={e => setBulk({ ...bulk, text: e.target.value })} /></label><button type="submit" className={primary} disabled={busy}>Import words</button>
        </form></details>
      </> : null}
      {data ? <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm">Search vocabulary<input type="search" className={input} value={query} onChange={e => setQuery(e.target.value)} placeholder="Word, definition or translation" /></label><label className="space-y-1 text-sm">Filter by lesson<select className={input} value={lessonFilter} onChange={e => setLessonFilter(e.target.value)}><option value="">All lessons</option><option value="none">No lesson</option>{filterLessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.group_name ? `${lesson.group_name} · ` : ""}{lesson.title}</option>)}</select></label></div>
        <p className="text-sm text-slate-500">{words.length} {words.length === 1 ? "word" : "words"}</p>
        {words.length ? <div className="grid gap-4 md:grid-cols-2">{words.map(word => <article key={word.id} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div><h2 className="break-words text-lg font-semibold">{word.word} <span className="text-sm font-normal text-slate-500">{word.part_of_speech}</span></h2><p className="mt-1 text-xs text-slate-500">{word.group_name ?? "Common vocabulary"}{word.lesson_title ? ` · ${word.lesson_title}` : ""}</p></div>
          <p className="whitespace-pre-wrap break-words">{word.definition_en}</p><p className="break-words text-slate-600" lang="ru">{word.translation_ru}</p>{word.example ? <p className="whitespace-pre-wrap break-words italic text-slate-500">{word.example}</p> : null}
          {staff ? <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <button className={secondary} type="button" disabled={busy} onClick={() => {
              setEditId(word.id);
              setDraft({ word: word.word, partOfSpeech: word.part_of_speech, definitionEn: word.definition_en, translationRu: word.translation_ru, example: word.example, groupId: word.group_id ?? "", lessonId: word.lesson_id ?? "" });
              form.current?.scrollIntoView({ block: "start", behavior: "smooth" });
            }}>Edit</button>
            {deleteId === word.id ? <><span className="self-center text-sm">Delete this word?</span>
              <button className={secondary} disabled={busy} type="button" onClick={() => void mutate(
                () => groupRequest(`/api/teacher/vocabulary/${word.id}`, "DELETE"), "Word deleted.",
                () => { setDeleteId(null); if (editId === word.id) { setEditId(null); setDraft(emptyDraft); } }
              )}>Confirm delete</button>
              <button className={secondary} type="button" onClick={() => setDeleteId(null)}>Cancel</button>
            </> : <button className={`${secondary} text-red-600`} type="button" disabled={busy} onClick={() => setDeleteId(word.id)}>Delete</button>}
          </div> : null}
        </article>)}</div> : <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">{query || lessonFilter ? "No words match your search." : staff ? "Add your first course word above." : "Your course vocabulary is empty. Your teacher can add words here."}</p>}
      </section> : null}
    </>}
  </main>;
}
