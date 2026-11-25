"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStudentAccount } from "@/components/dashboard/StudentAccount";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { groupRequest } from "@/lib/groupApi";
import type { LiveSession } from "@/lib/liveLessons";
import type { LessonRow } from "@/lib/lessons";
import { GroupAnswers } from "@/components/live/LivePractice";
import { useLiveSnapshot } from "@/components/live/useLiveSnapshot";

function useLiveSessions(lessonId?: string) {
  const { userId, isLoading } = useStudentAccount();
  const [loaded, setLoaded] = useState<{ owner: string; sessions: LiveSession[] } | null>(null);
  const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!userId || isLoading) return;
    let active = true, pending = false, again = false;
    const controller = new AbortController();
    async function read() {
      if (!active) return;
      if (pending) { again = true; return; }
      pending = true;
      try {
        do {
          again = false;
          const data = await groupRequest<{ sessions: LiveSession[] }>(lessonId ? `/api/teacher/lessons/${lessonId}/live` : "/api/live", "GET", undefined, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]));
          if (active) { setLoaded({ owner: userId!, sessions: data.sessions }); setError(""); }
        } while (active && again);
      } catch { if (active) setError("Live practice could not be loaded."); }
      finally { pending = false; }
    }
    void read();
    const db = getSupabaseBrowserClient();
    const channel = db.channel(`live-list:${lessonId ?? "course"}:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_sessions", ...(lessonId ? { filter: `lesson_id=eq.${lessonId}` } : {}) }, () => { void read(); })
      .subscribe(status => { if (status === "SUBSCRIBED") void read(); });
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void read(); }, 15000);
    const recover = () => { if (document.visibilityState === "visible") void read(); };
    window.addEventListener("online", recover); document.addEventListener("visibilitychange", recover);
    return () => { active = false; controller.abort(); window.clearInterval(timer); window.removeEventListener("online", recover); document.removeEventListener("visibilitychange", recover); void db.removeChannel(channel).catch(() => {}); };
  }, [userId, isLoading, lessonId, retry]);
  return { sessions: loaded && loaded.owner === userId ? loaded.sessions : [], error: userId ? error : "", retry: () => setRetry(r => r + 1) };
}
export function LiveCourseBanner({ lessons = [] }: { lessons?: LessonRow[] }) {
  const state = useLiveSessions();
  if (state.error) return <p className="text-sm text-slate-500">{state.error} <button className="min-h-11 cursor-pointer underline" type="button" onClick={state.retry}>Retry</button></p>;
  if (!state.sessions.length) return null;
  return <section className="space-y-3" aria-label="Live lessons">{state.sessions.map(session => { const lesson = lessons.find(item => item.id === session.lesson_id); return <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4" key={session.id}><div className="min-w-0"><p className="font-semibold text-blue-900">Your teacher has started live practice</p>{lesson ? <p className="break-words text-sm text-slate-600">{lesson.group_name} · {lesson.title}</p> : null}<p className="text-sm text-slate-600">Question {session.current_position} of {session.question_ids.length}</p></div><Link className="hub-primary min-h-11" href={`/live/${session.join_code}`}>Join live practice</Link></div>; })}</section>;
}
export function LiveLessonResults({ lessonId }: { lessonId: string }) {
  const state = useLiveSessions(lessonId);
  const [selected, setSelected] = useState("");
  const finished = state.sessions.filter(session => session.status === "finished");
  const code = finished.find(session => session.join_code === selected)?.join_code ?? finished[0]?.join_code;
  const report = useLiveSnapshot(code);
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Live classwork</h2><Link className="hub-primary min-h-11" href={`/teacher/lessons/${lessonId}/live`}>Open live practice</Link></div>
    {state.error ? <p role="alert" className="text-sm text-slate-500">{state.error} <button className="min-h-11 cursor-pointer underline" type="button" onClick={state.retry}>Retry</button></p> : null}
    {state.sessions.some(session => session.status === "active") ? <p className="text-sm text-blue-600">A live session is running. Open it to manage questions.</p> : null}
    {finished.length ? <><label className="block max-w-md space-y-1 text-sm">Finished session<select className="min-h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3" value={code} onChange={e => setSelected(e.target.value)}>{finished.map(session => <option key={session.id} value={session.join_code}>{new Date(session.finished_at!).toLocaleString()}</option>)}</select></label>{report.loading ? <p role="status">Loading results…</p> : null}{report.error ? <p role="alert" className="text-sm text-slate-600">{report.error} <button className="min-h-11 cursor-pointer underline" onClick={report.reload} type="button">Retry</button></p> : null}{report.data?.staff ? <GroupAnswers snapshot={report.data} /> : null}</> : <p className="text-sm text-slate-500">Finished session results will appear here.</p>}
  </section>;
}
