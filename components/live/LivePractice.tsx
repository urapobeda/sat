"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { useStudentAccount } from "@/components/dashboard/StudentAccount";
import { QuestionStem, QuestionAnswers } from "@/components/quiz/QuestionCard";
import { QuestionHighlightControls, useQuestionHighlight } from "@/components/quiz/QuestionHighlight";
import { MathText } from "@/components/quiz/MathText";
import { VocabularyProvider } from "@/components/vocabulary/VocabularyProvider";
import { groupRequest } from "@/lib/groupApi";
import { LIVE_CODE, liveAnsweredLabel, liveGroupRows, type LiveSession, type LiveSnapshot } from "@/lib/liveLessons";
import { useLiveSnapshot } from "@/components/live/useLiveSnapshot";

const button = "min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:cursor-default disabled:opacity-50";
export function GroupAnswers({ snapshot }: { snapshot: LiveSnapshot }) {
  const rows = liveGroupRows(snapshot);
  const answered = rows.filter(row => row.cells[snapshot.session.current_position - 1]).length;
  return <section className="hub-card min-w-0 space-y-4 p-4 sm:p-5">
    <header className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Group answers</h2><span role="status" className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">{liveAnsweredLabel(answered, rows.length)}</span></header>
    <p className="text-xs text-slate-500">A dash means no answer was submitted. Correct is out of {snapshot.session.question_ids.length} questions.</p>
    <div className="max-h-[65dvh] overflow-auto rounded-xl border border-slate-200" tabIndex={0} role="region" aria-label="Group answer table">
      <table className="w-full border-collapse text-left text-sm"><caption className="sr-only">Student answers and number correct</caption><thead className="sticky top-0 bg-slate-50"><tr><th className="p-3">Student</th>{snapshot.session.question_ids.map((id, i) => <th className={`min-w-16 p-3 ${i + 1 === snapshot.session.current_position ? "text-blue-600" : ""}`} key={id}>Q{i + 1}</th>)}<th className="p-3">Correct</th></tr></thead>
        <tbody>{rows.map(row => <tr className="border-t border-slate-200" key={row.student_id}><th className="min-w-40 max-w-60 break-words p-3 font-medium">{row.full_name}</th>{row.cells.map((answer, i) => <td className={`max-w-40 break-words p-3 ${answer ? answer.is_correct ? "text-emerald-700" : "text-rose-600" : "text-slate-400"}`} key={i}>{answer ? <span aria-label={`${answer.choice}, ${answer.is_correct ? "correct" : "incorrect"}`}>{answer.choice} {answer.is_correct ? "✓" : "✗"}</span> : "—"}</td>)}<td className="p-3 font-semibold">{row.correct}/{snapshot.session.question_ids.length}</td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}
export function LiveQuestion({ snapshot, student, onAnswer, busy }: { snapshot: LiveSnapshot; student?: boolean; onAnswer?: (choice: string) => void; busy?: boolean }) {
  const highlight = useQuestionHighlight();
  const article = useRef<HTMLElement>(null);
  const previousQuestion = useRef(snapshot.question.id);
  const [draft, setDraft] = useState<{ question: string; value: string | null }>({ question: "", value: null });
  const { question, session, own_answer: own } = snapshot;
  const revealed = session.revealed_positions.includes(session.current_position);
  const locked = !student || Boolean(own) || revealed || session.status === "finished";
  const selected = draft.question === question.id ? draft.value : null;
  useEffect(() => {
    if (student && previousQuestion.current !== question.id) article.current?.scrollIntoView({ block: "start" });
    previousQuestion.current = question.id;
  }, [question.id, student]);
  return <article ref={article} className="hub-card min-w-0 space-y-5 p-4 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">Question {session.current_position} of {session.question_ids.length}</p><QuestionHighlightControls {...highlight} /></header>
    <QuestionStem highlight={highlight} number={session.current_position} question={question} className="text-lg leading-8" />
    {student && !locked ? <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (selected?.trim()) onAnswer?.(selected.trim()); }}>
      <fieldset disabled={busy} className="space-y-4">
      {question.choices.length ? <QuestionAnswers key={question.id} question={question} selectedAnswer={selected} mode="test" onSelect={choice => setDraft({ question: question.id, value: choice })} /> : <label className="block space-y-2 text-sm">Your answer<input className="block min-h-11 w-full max-w-xs rounded-xl border border-slate-300 bg-transparent px-3" maxLength={200} value={selected ?? ""} onChange={event => setDraft({ question: question.id, value: event.target.value })} required /><span className="block text-slate-500">Enter a number, decimal, or fraction. Do not enter a mixed number.</span></label>}
      <button className="hub-primary min-h-11 cursor-pointer disabled:opacity-50" disabled={!selected?.trim() || busy} type="submit">{busy ? "Saving answer…" : "Submit answer"}</button>
      </fieldset>
    </form> : <>
      {question.choices.length ? <ol className="space-y-3">{question.choices.map(choice => <li className={`flex gap-3 rounded-xl border p-3 ${student && own?.choice === choice.label ? "border-blue-500 bg-blue-50" : "border-slate-200"}`} key={choice.label}>
        <span className="font-semibold">{choice.label}</span><div className="min-w-0">
          {choice.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- question-bank figures from Storage
            <img alt={`Choice ${choice.label}`} src={choice.imageUrl} className="h-auto max-h-64 max-w-full" />
          ) : null}<MathText text={choice.text} />
        </div>
      </li>)}</ol> : null}
      {student && own ? <p className="text-sm text-slate-600">Your answer: <strong>{own.choice}</strong></p> : null}
    </>}
    {student ? own?.is_correct !== null && own?.is_correct !== undefined ? <p role="status" className={`rounded-xl p-4 font-medium ${own.is_correct ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{own.is_correct ? "Correct" : "Incorrect"}</p> : own ? <p role="status" className="text-slate-600">Answer saved. Waiting for your teacher to reveal the result.</p> : revealed ? <p role="status" className="text-slate-600">No answer submitted. Wait for the next question.</p> : null : snapshot.correct_answer ? <p className="rounded-xl bg-emerald-50 p-4 text-emerald-800">Correct answer: {snapshot.correct_answer}</p> : null}
  </article>;
}
export function LiveSessionScreen({ code, teacher = false }: { code: string; teacher?: boolean }) {
  const state = useLiveSnapshot(code);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const snapshot = state.data;
  async function control(action: "next" | "reveal" | "finish") {
    if (!snapshot || busy) return;
    setBusy(true); setNotice(null);
    try { await groupRequest(`/api/teacher/live/${code}`, "POST", { action, position: snapshot.session.current_position }, AbortSignal.timeout(15000)); setFinishing(false); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not update the session."); }
    finally { setBusy(false); state.reload(); }
  }
  async function answer(choice: string) {
    if (!snapshot || busy) return;
    setBusy(true); setNotice(null);
    try { await groupRequest(`/api/live/${code}`, "POST", { sessionId: snapshot.session.id, questionId: snapshot.question.id, choice }, AbortSignal.timeout(15000)); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not save your answer. Try again."); }
    finally { state.reload(); setBusy(false); }
  }
  async function copyLink() {
    const link = `${window.location.origin}/live/${code}`;
    try { await navigator.clipboard.writeText(link); setNotice("Link copied."); }
    catch { setNotice(`Copy this link: ${link}`); }
  }
  return <div className="space-y-5">
    {state.signedOut ? <div className="hub-card p-6"><p>Sign in with your group account to join live practice.</p><Link className="hub-primary mt-4" href={`/auth?next=${encodeURIComponent(`/live/${code}`)}`}>Sign in</Link></div> : null}
    {state.loading ? <p role="status">Loading live practice…</p> : null}
    {state.error ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">{state.error} <button className="min-h-11 cursor-pointer underline" type="button" onClick={state.reload}>Retry</button></p> : null}
    {notice ? <p role="status" className="text-sm text-slate-600">{notice}</p> : null}
    {snapshot ? <>
      <header className="space-y-3"><h1 className="text-2xl font-bold">{snapshot.lesson_title}</h1><p className="text-sm text-slate-500">{snapshot.session.status === "finished" ? "Session finished" : state.connected ? "Live · connected" : "Reconnecting · checking for updates"}</p>
        {teacher && snapshot.staff ? <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => void copyLink()}>Copy link</button><span className="self-center px-2 font-mono text-sm">{code}</span>
          {snapshot.session.status === "active" ? <><button className={button} type="button" disabled={busy || snapshot.session.revealed_positions.includes(snapshot.session.current_position)} onClick={() => void control("reveal")}>Reveal answer</button><button className="hub-primary min-h-11 cursor-pointer disabled:opacity-50" type="button" disabled={busy || snapshot.session.current_position >= snapshot.session.question_ids.length} onClick={() => void control("next")}>Next question</button><button className={button} disabled={busy} type="button" onClick={() => setFinishing(true)}>Finish</button></> : null}
        </div> : null}
      </header>
      {finishing ? <div className="hub-card space-y-3 p-4"><p>Finish this session? Students will no longer be able to answer.</p><button className="hub-primary min-h-11 mr-2" type="button" disabled={busy} onClick={() => void control("finish")}>Finish session</button><button className={button} type="button" onClick={() => setFinishing(false)}>Cancel</button></div> : null}
      {snapshot.staff ? <>{!teacher ? <Link className="hub-text-link" href={`/teacher/lessons/${snapshot.session.lesson_id}/live`}>Open teacher controls</Link> : null}<div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"><LiveQuestion snapshot={snapshot} /><GroupAnswers snapshot={snapshot} /></div></> : snapshot.session.status === "finished" ? <div className="hub-card space-y-3 p-6"><h2 className="text-xl font-semibold">Live practice finished</h2><p>Your score: {snapshot.own_correct ?? 0}/{snapshot.session.question_ids.length}</p><Link className="hub-text-link" href="/course">Back to course plan</Link></div> : <VocabularyProvider enabled={snapshot.question.section === "reading-writing"}><LiveQuestion snapshot={snapshot} student onAnswer={choice => void answer(choice)} busy={busy} /></VocabularyProvider>}
    </> : null}
  </div>;
}
export function TeacherLivePage({ lessonId }: { lessonId: string }) {
  const { userId, isLoading } = useStudentAccount();
  const [sessions, setSessions] = useState<LiveSession[]>([]); const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!userId || isLoading) return;
    let active = true;
    groupRequest<{ sessions: LiveSession[] }>(`/api/teacher/lessons/${lessonId}/live`, "GET", undefined, AbortSignal.timeout(15000)).then(data => {
      if (active) { setSessions(data.sessions); setCode(data.sessions.find(item => item.status === "active")?.join_code ?? ""); setError(""); }
    }).catch(error => { if (active) setError(error instanceof Error ? error.message : "Could not load live practice."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lessonId, userId, isLoading, retry]);
  async function start() {
    setBusy(true); setError("");
    try {
      const data = await groupRequest<{ code: string }>(`/api/teacher/lessons/${lessonId}/live`, "POST", undefined, AbortSignal.timeout(15000)); setCode(data.code);
      const history = await groupRequest<{ sessions: LiveSession[] }>(`/api/teacher/lessons/${lessonId}/live`, "GET", undefined, AbortSignal.timeout(15000)); setSessions(history.sessions);
    }
    catch (error) { setError(error instanceof Error ? error.message : "Could not start live practice."); }
    finally { setBusy(false); }
  }
  return <main className="space-y-5"><Link className="hub-text-link text-sm" href={`/teacher/lessons/${lessonId}`}>← Back to lesson</Link>
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">Live classwork</h1><button className="hub-primary min-h-11 cursor-pointer disabled:opacity-50" disabled={busy || loading} type="button" onClick={() => void start()}>{busy ? "Starting…" : code ? "Start or resume active session" : "Start live practice"}</button></div>
    <p className="text-sm text-slate-500">Uses the saved Classwork questions and current group roster. Students submit once per question.</p>
    {error ? <p role="alert" className="text-rose-600">{error} <button className="min-h-11 cursor-pointer underline" type="button" onClick={() => { setLoading(true); setRetry(r => r + 1); }}>Retry loading sessions</button></p> : null}{loading ? <p role="status">Loading sessions…</p> : null}
    {sessions.length ? <label className="block max-w-md space-y-1 text-sm">Saved session<select className="min-h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3" value={code} onChange={e => setCode(e.target.value)}><option value="">Choose a session</option>{sessions.map(item => <option key={item.id} value={item.join_code}>{new Date(item.started_at).toLocaleString()} · {item.status}</option>)}</select></label> : null}
    {code ? <LiveSessionScreen key={code} code={code} teacher /> : null}
  </main>;
}
export function StudentLivePage({ code }: { code: string }) {
  return <StudentShell active="course"><main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-7"><Link href="/course" className="hub-text-link text-sm">← Course plan</Link>{LIVE_CODE.test(code) ? <LiveSessionScreen code={code} /> : <p role="alert">Invalid live practice code.</p>}</main></StudentShell>;
}
