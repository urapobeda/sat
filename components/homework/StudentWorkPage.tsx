"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { groupRequest } from "@/lib/groupApi";
import { duration, type AssignmentFeedback, type StudentWork } from "@/lib/assignmentReport";
import { MathText } from "@/components/quiz/MathText";
import { AssignmentFeedbackList } from "@/components/homework/AssignmentFeedbackList";
import { formatAlmaty } from "@/lib/timezone";

export function StudentWorkPage({ assignmentId, studentId }: { assignmentId: string; studentId: string }) {
  const [work, setWork] = useState<StudentWork | null>(null);
  const [attempt, setAttempt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const endpoint = `/api/teacher/homework/${assignmentId}/student/${studentId}`;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(null);
      try {
        const data = await groupRequest<StudentWork>(`${endpoint}${attempt ? `?submission=${attempt}` : ""}`, "GET", undefined, controller.signal);
        if (!controller.signal.aborted) setWork(data);
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load the submission."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [endpoint, attempt, retry]);
  async function retake() {
    if (!work?.submission) return;
    setSaving(true); setError(null); setNotice(null);
    try { await groupRequest(endpoint, "POST", { action: "retake", submissionId: work.submission.id }); setNotice("Exactly one extra attempt has been granted."); setRetry((n) => n + 1); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not grant a retake."); }
    finally { setSaving(false); }
  }
  return <section className="space-y-5">
    <Link className="hub-text-link text-sm" href={`/teacher/homework/${assignmentId}`}>← Back to assignment</Link>
    {error ? <p role="alert" className="text-sm text-rose-600">{error} <button className="cursor-pointer underline" type="button" onClick={() => setRetry((n) => n + 1)}>Retry</button></p> : null}
    {notice ? <p role="status" className="text-sm text-emerald-700">{notice}</p> : null}
    {loading ? <p role="status">Loading submission…</p> : work ? <>
      <div className="hub-card space-y-3 p-5"><h1 className="text-3xl font-bold">{work.student.full_name}</h1>
        {!work.submission ? <p className="text-sm text-slate-600">The student has not started this assignment yet.</p> : <>
          <label className="flex max-w-md flex-col gap-1 text-sm">Attempt<select className="rounded-lg border border-slate-200 bg-transparent p-2" value={work.submission.id} onChange={(e) => { setAttempt(e.target.value); setNotice(null); }} disabled={saving}>{work.attempts.map((item) => <option key={item.id} value={item.id}>#{item.attempt_no} · {item.status === "submitted" ? `Submitted ${item.submitted_at ? formatAlmaty(item.submitted_at) : ""}` : "In progress"}</option>)}</select></label>
          <p className="text-sm text-slate-600">{work.submission.status === "submitted" ? `Score: ${work.submission.correct_count ?? 0}/${work.submission.total_count ?? 0}` : "The student is still working. Answers may change."}</p>
          <button className="hub-primary cursor-pointer disabled:opacity-50" type="button" disabled={saving || work.retakeGranted || work.submission.status !== "submitted" || !work.student.is_member || work.submission.id !== work.attempts[0]?.id} onClick={() => void retake()}>{work.retakeGranted ? "Retake already granted" : "Grant a retake"}</button>
          <p className="text-xs text-slate-500">Student’s extra attempts: {work.student.extra_attempts}. Granting again for the same submission does not raise the limit.</p>
        </>}
      </div>
      {work.submission ? <>
        <FeedbackEditor endpoint={endpoint} submissionId={work.submission.id} questionId={null} disabled={work.submission.status !== "submitted"} onSaved={(item) => setWork((old) => old ? { ...old, feedback: [...old.feedback, item] } : old)} />
        <AssignmentFeedbackList feedback={work.feedback.filter((item) => item.question_id === null)} questionIds={work.questions.map((q) => q.id)} />
        {work.questions.map((question, index) => {
          const answer = work.answers.find((item) => item.question_id === question.id);
          return <article className="hub-card space-y-4 p-5" key={question.id}>
            <h2 className="text-lg font-semibold">Question {index + 1} · {question.topic}</h2>
            <MathText text={question.question} images={question.imageUrls} className="leading-7" />
            <div className="grid gap-2 sm:grid-cols-2">{question.choices.map((choice) => <div className="rounded-lg border border-slate-200 p-3 text-sm" key={choice.label}><span className="font-semibold">{choice.label}. </span><MathText text={choice.text} images={choice.imageUrl ? [choice.imageUrl] : []} /></div>)}</div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm"><span>Student’s answer: <strong>{answer?.answer ?? "No answer"}</strong></span><span>Correct answer: <strong>{question.correctAnswer}</strong></span><span>Time on question: {duration(answer?.time_spent_seconds ?? null)}</span></div>
            <MathText text={question.explanation} className="text-sm leading-6 text-slate-600" />
            <AssignmentFeedbackList feedback={work.feedback.filter((item) => item.question_id === question.id)} questionIds={work.questions.map((q) => q.id)} />
            <FeedbackEditor endpoint={endpoint} submissionId={work.submission!.id} questionId={question.id} disabled={work.submission!.status !== "submitted"} onSaved={(item) => setWork((old) => old ? { ...old, feedback: [...old.feedback, item] } : old)} />
          </article>;
        })}
      </> : null}
    </> : null}
  </section>;
}
function FeedbackEditor({ endpoint, submissionId, questionId, disabled, onSaved }: { endpoint: string; submissionId: string; questionId: string | null; disabled: boolean; onSaved: (item: AssignmentFeedback) => void }) {
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError(null);
    try {
      const result = await groupRequest<{ feedback: AssignmentFeedback }>(endpoint, "POST", { action: "comment", submissionId, questionId, body: body.trim() });
      setBody(""); onSaved(result.feedback);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save the comment."); }
    finally { setPending(false); }
  }
  return <form className="hub-card space-y-2 p-4" onSubmit={submit}><label className="flex flex-col gap-1 text-sm font-medium">{questionId ? "Comment on this question" : "Comment on the whole submission"}<textarea disabled={disabled || pending} required maxLength={5000} className="min-h-20 rounded-xl border border-slate-200 bg-transparent p-3 font-normal" value={body} onChange={(e) => setBody(e.target.value)} /></label>{disabled ? <p className="text-xs text-slate-500">You can comment once the work is submitted.</p> : null}<button className="hub-primary cursor-pointer disabled:opacity-50" type="submit" disabled={disabled || pending || !body.trim()}>{pending ? "Saving…" : "Add comment"}</button>{error ? <p role="alert" className="text-sm text-rose-600">{error}</p> : null}</form>;
}
