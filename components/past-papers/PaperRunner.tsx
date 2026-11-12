"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bookmark, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getSupabaseAuthHeaders } from "@/lib/supabase/authHeaders";
import { formatTime } from "@/components/quiz/Timer";
import type { PaperRunnerSnapshot } from "@/lib/paperRunner";

type Draft = { answers: Record<string, string>; flags: Record<string, boolean>; index: number };
const emptyDraft = (): Draft => ({ answers: {}, flags: {}, index: 0 });

async function paperRequest<T>(payload: object): Promise<T> {
  const response = await fetch("/api/papers/attempts", {
    method: "POST", headers: { ...await getSupabaseAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload), cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Unable to load this attempt.");
  return data;
}

export function PaperRunner({ slug, section, attemptId }: { slug: string; section: string; attemptId?: string }) {
  const [snapshot, setSnapshot] = useState<PaperRunnerSnapshot | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const active = useRef<PaperRunnerSnapshot | null>(null);
  const latest = useRef<Draft>(emptyDraft());
  const revision = useRef(0);
  const pending = useRef(Promise.resolve());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submission = useRef(false);
  const failed = useRef(false);
  const expiry = useRef<string | null>(null);
  const mounted = useRef(true);

  function backup(value: Draft) {
    const state = active.current;
    if (!state?.current) return;
    try {
      localStorage.setItem(`sat-paper:${state.userId}:${state.attemptId}:${state.current}`, JSON.stringify({ ...value, revision: revision.current }));
    } catch {
      // Server saves continue when local browser storage is unavailable.
    }
  }

  function display(state: PaperRunnerSnapshot) {
    active.current = state;
    const location = new URL(window.location.href);
    location.searchParams.set("attempt", state.attemptId);
    window.history.replaceState(null, "", location);
    const entry = state.modules.find((part) => part.id === state.current);
    const value: Draft = entry ? { answers: entry.run.answers, flags: entry.run.flags, index: entry.run.current_index } : emptyDraft();
    revision.current = entry?.run.revision ?? 0;
    if (entry) {
      try {
        const raw = JSON.parse(localStorage.getItem(`sat-paper:${state.userId}:${state.attemptId}:${state.current}`) ?? "null");
        if (raw && raw.revision === revision.current && typeof raw.answers === "object" && typeof raw.flags === "object") {
          const validIds = new Set(state.items.map((item) => item.id));
          value.answers = Object.fromEntries(Object.entries(raw.answers).filter(([id, answer]) => validIds.has(id) && typeof answer === "string")) as Record<string, string>;
          value.flags = Object.fromEntries(Object.entries(raw.flags).filter(([id, flag]) => validIds.has(id) && typeof flag === "boolean")) as Record<string, boolean>;
          value.index = Number.isInteger(raw.index) ? Math.max(0, Math.min(raw.index, state.items.length - 1)) : value.index;
        }
      } catch {
        // Ignore invalid drafts and restore the server's saved attempt.
      }
    }
    latest.current = value;
    setDraft(value);
    setSnapshot(state);
    setSeconds(entry?.run.deadline ? Math.max(0, Math.ceil((Date.parse(entry.run.deadline) - Date.now()) / 1000)) : 0);
  }

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    void paperRequest<PaperRunnerSnapshot>(attemptId ? { action: "get", attemptId } : { action: "open", slug, section })
      .then((state) => { if (!cancelled) display(state); })
      .catch((reason: Error) => { if (!cancelled) setError(reason.message); });
    return () => {
      cancelled = true;
      mounted.current = false;
      if (debounce.current) clearTimeout(debounce.current);
    };
    // display restores refs and local drafts from the returned server snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, section, attemptId]);

  async function save() {
    const state = active.current;
    if (!state?.current || submission.current || failed.current) return;
    const sent = latest.current;
    setSaving(true);
    try {
      const saved = await paperRequest<{ revision: number }>({
        action: "save", attemptId: state.attemptId, moduleId: state.current,
        revision: revision.current, ...sent
      });
      revision.current = saved.revision;
      backup(latest.current);
      if (mounted.current) setError(null);
    } catch (reason) {
      failed.current = true;
      if (mounted.current) setError(reason instanceof Error ? reason.message : "Your answer could not be saved.");
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  function change(value: Draft) {
    if (submission.current || seconds === 0) return;
    latest.current = value;
    setDraft(value);
    backup(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { pending.current = pending.current.then(save); }, 350);
  }

  async function submit(automatic = false) {
    if (submission.current || !active.current?.current) return;
    if (!automatic && !window.confirm("Submit this module? You cannot return to it after submission.")) return;
    if (debounce.current) clearTimeout(debounce.current);
    submission.current = true;
    setBusy(true);
    await pending.current;
    const state = active.current!;
    try {
      const next = await paperRequest<PaperRunnerSnapshot>({
        action: "submit", attemptId: state.attemptId, moduleId: state.current,
        revision: revision.current, ...latest.current
      });
      try { localStorage.removeItem(`sat-paper:${state.userId}:${state.attemptId}:${state.current}`); } catch { /* Browser storage may be unavailable. */ }
      failed.current = false;
      setError(null);
      display(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Submission failed. Please retry.");
    } finally {
      submission.current = false;
      setBusy(false);
    }
  }

  const current = snapshot?.modules.find((part) => part.id === snapshot.current);
  const deadline = current?.run.deadline;
  useEffect(() => {
    if (!deadline || !current) return;
    const moduleId = current.id;
    function tick() {
      const value = Math.max(0, Math.ceil((Date.parse(deadline!) - Date.now()) / 1000));
      setSeconds(value);
      if (value === 0 && expiry.current !== moduleId) {
        expiry.current = moduleId;
        void submit(true);
      }
    }
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
    // The deadline and module ID determine expiry. submit reads current refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline, current?.id]);

  const item = snapshot?.items[draft.index];
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <Link className="inline-flex items-center gap-1 text-sm text-slate-600" href={`/past-papers/${slug}`}><ChevronLeft size={17} /> Go back</Link>
        <div className="text-center"><p className="text-sm font-bold">{current ? `${current.section === "math" ? "Math" : "Reading & Writing"} · Module ${current.module_number}` : snapshot?.title ?? "Practice Paper"}</p>
          {current ? <p className="font-mono text-xl font-bold" aria-label="Time remaining">{formatTime(seconds)}</p> : null}</div>
        <span className="text-xs text-slate-500" role="status">{busy ? "Submitting…" : saving ? "Saving…" : ""}</span>
      </header>
      {error ? <div className="mx-auto mt-4 max-w-5xl rounded-xl bg-amber-50 p-4 text-sm text-amber-900" role="alert">
        {error} <button className="ml-3 cursor-pointer underline" onClick={() => { failed.current = false; pending.current = pending.current.then(save); }} type="button">Retry save</button>
        <button className="ml-3 cursor-pointer underline" onClick={() => window.location.reload()} type="button">Reload saved attempt</button>
      </div> : null}
      {!snapshot && !error ? <p className="flex justify-center gap-2 p-12"><Loader2 className="animate-spin" /> Loading your paper…</p> : null}
      {snapshot?.completed ? <section className="mx-auto max-w-4xl p-6">
        <h1 className="text-3xl font-bold">Practice paper completed</h1>
        <p className="mt-3">{snapshot.modules.reduce((sum, part) => sum + (part.run.score ?? 0), 0)} of {snapshot.modules.reduce((sum, part) => sum + part.question_count, 0)} correct</p>
        {snapshot.modules.map((part) => <p key={part.id} className="mt-2">{part.section === "math" ? "Math" : "Reading & Writing"} · Module {part.module_number} — {part.run.score}/{part.question_count}</p>)}
        <h2 className="mt-8 text-xl font-bold">Answer review</h2>
        <ol className="mt-4 space-y-2">{snapshot.review.map((entry, index) => <li className={`rounded-xl border p-3 ${entry.correct ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`} key={entry.id}>
          <span className="font-bold">{index + 1}.</span> Your answer {entry.selected || "—"} · Correct answer {entry.accepted.join(" or ")}
        </li>)}</ol>
      </section> : null}
      {item && current ? <>
        <section className="mx-auto max-w-6xl px-4 py-5 sm:px-8">
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-slate-100 px-4 py-3">
            <span className="rounded-md bg-slate-950 px-3 py-1 font-bold text-white">{item.position}</span>
            <button type="button" className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium disabled:cursor-default" disabled={busy || seconds === 0}
              aria-pressed={draft.flags[item.id] ?? false} onClick={() => change({ ...draft, flags: { ...draft.flags, [item.id]: !draft.flags[item.id] } })}>
              <Bookmark size={17} fill={draft.flags[item.id] ? "currentColor" : "none"} /> Mark for Review
            </button>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="min-w-0 space-y-4">{item.images.map((url, page) => (
              // eslint-disable-next-line @next/next/no-img-element -- signed question images preserve source math and diagrams
              <img key={url} src={url} alt={`Question ${item.position}, page ${page + 1}. ${item.text}`} className="mx-auto h-auto w-full max-w-[900px]" />
            ))}</div>
            <fieldset className="space-y-3" disabled={busy || seconds === 0}>
              <legend className="mb-3 font-bold">Your answer</legend>
              {item.question_type === "multiple-choice" ? ["A", "B", "C", "D"].map((label) => <button type="button" key={label}
                aria-pressed={draft.answers[item.id] === label}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-left disabled:cursor-default ${draft.answers[item.id] === label ? "border-blue-600 bg-blue-50" : "border-slate-300 hover:bg-slate-50"}`}
                onClick={() => change({ ...draft, answers: { ...draft.answers, [item.id]: label } })}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border font-bold">{label}</span> Option {label}
              </button>) : <label className="block text-sm">Enter a number, decimal or fraction
                <input className="mt-2 w-full rounded-xl border border-slate-400 px-4 py-3 text-lg" inputMode="decimal" autoComplete="off" value={draft.answers[item.id] ?? ""} maxLength={20}
                  onChange={(event) => change({ ...draft, answers: { ...draft.answers, [item.id]: event.target.value.replace(/[^0-9./-]/g, "") } })} />
              </label>}
            </fieldset>
          </div>
        </section>
        <footer className="sticky bottom-0 z-10 border-t border-slate-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <details className="relative"><summary className="cursor-pointer rounded-lg bg-slate-950 px-4 py-2 text-sm text-white">Question {draft.index + 1} of {snapshot.items.length}</summary>
              <div className="absolute bottom-12 left-0 grid max-h-80 w-72 grid-cols-6 gap-2 overflow-auto rounded-xl border bg-white p-3 shadow-lg">{snapshot.items.map((q, index) => <button type="button" className={`relative cursor-pointer rounded-lg border p-2 text-sm ${draft.index === index ? "border-blue-600 ring-1 ring-blue-600" : "border-slate-200"} ${draft.answers[q.id] ? "bg-blue-50" : "bg-white"}`} key={q.id}
                onClick={() => change({ ...draft, index })}>{index + 1}{draft.flags[q.id] ? <span className="absolute right-0 top-0 text-amber-600">●</span> : null}</button>)}</div>
            </details>
            <div className="flex items-center gap-2">
              <button className="inline-flex cursor-pointer items-center rounded-lg border px-3 py-2 text-sm disabled:opacity-40" type="button" disabled={draft.index === 0 || busy || seconds === 0} onClick={() => change({ ...draft, index: draft.index - 1 })}><ChevronLeft size={16} /> Previous</button>
              {draft.index < snapshot.items.length - 1 ? <button className="inline-flex cursor-pointer items-center rounded-lg border px-3 py-2 text-sm disabled:opacity-40" disabled={busy || seconds === 0} type="button" onClick={() => change({ ...draft, index: draft.index + 1 })}>Next <ChevronRight size={16} /></button> : null}
              <button className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" type="button" disabled={busy} onClick={() => void submit()}>{busy ? "Submitting…" : "Submit module"}</button>
            </div>
          </div>
        </footer>
      </> : null}
    </main>
  );
}
