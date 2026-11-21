"use client";

import { ArrowLeft, ArrowRight, Calculator, Loader2, Search, Send, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HomeworkClock } from "@/lib/homeworkClock";
import type { AssignmentFeedback } from "@/lib/assignmentReport";
import { AssignmentFeedbackList } from "@/components/homework/AssignmentFeedbackList";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { confirmLeavingStudy, StudentShell } from "@/components/dashboard/StudentShell";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ReviewAnswers } from "@/components/quiz/ReviewAnswers";
import { Timer } from "@/components/quiz/Timer";
import { DesmosPanel } from "@/components/quiz/DesmosPanel";
import { createDesmosStateStore } from "@/lib/desmos";
import { getSupabaseAuthHeaders } from "@/lib/supabase/authHeaders";
import { isPastDue } from "@/lib/homework";
import { formatAlmaty } from "@/lib/timezone";
import type { Question, ReviewQuestion } from "@/types/sat";

type Snapshot = {
  submissionId: string;
  assignmentId: string;
  title: string;
  instructions: string;
  timeLimitMinutes: number | null;
  dueAt: string | null;
  showAnswers: "after_submit" | "after_due" | "never";
  status: "in_progress" | "submitted";
  startedAt: string;
  submittedAt: string | null;
  correctCount: number | null;
  totalCount: number | null;
  late: boolean;
  questions: Question[];
  answers: Record<string, string>;
  review: ReviewQuestion[] | null;
  feedback: AssignmentFeedback[];
  feedbackError: boolean;
  answerTimes: Record<string, number | null>;
  canRetake: boolean;
};

async function callAttempts<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/homework/attempts", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...(await getSupabaseAuthHeaders()) },
    method: "POST"
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "The action could not be completed.");
  return payload as T;
}

export function HomeworkRunner({ assignmentId, initialSubmissionId }: { assignmentId: string; initialSubmissionId?: string }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorStates, setCalculatorStates] = useState(createDesmosStateStore);
  const submitDialog = useRef<HTMLDialogElement>(null);
  const hasSubmitted = useRef(false);
  const activeSubmission = useRef<string | null>(null);
  const answersRef = useRef<Record<string, string>>({});
  const clock = useRef(new HomeworkClock());
  const pending = useRef(Promise.resolve());
  const failed = useRef(new Map<string, { questionId: string; answer: string | null; seconds: number }>());

  const install = useCallback((result: Snapshot) => {
    setCalculatorOpen(false);
    setCalculatorStates(createDesmosStateStore());
    activeSubmission.current = result.submissionId;
    clock.current = new HomeworkClock(result.answerTimes ?? {});
    failed.current.clear(); answersRef.current = result.answers; hasSubmitted.current = false;
    setSnapshot(result); setAnswers(result.answers); setCurrentIndex(0); setSaveError(false);
    setRemainingSeconds(result.timeLimitMinutes && result.status === "in_progress" ? Math.max(0,Math.ceil((Date.parse(result.startedAt)+result.timeLimitMinutes*60000-Date.now())/1000)):null);
  }, []);
  function persist(sid: string, questionId: string, answer: string | null) {
    const payload = { questionId, answer, seconds: clock.current.seconds(questionId) };
    pending.current = pending.current.catch(() => {}).then(async () => {
      try {
        await callAttempts({ action: "answer", submissionId: sid, questionId, answer, timeSpentSeconds: payload.seconds });
        if (activeSubmission.current === sid) failed.current.delete(questionId);
      } catch {
        if (activeSubmission.current === sid) failed.current.set(questionId, payload);
      }
      if (activeSubmission.current === sid) setSaveError(failed.current.size > 0);
    });
  }
  const saveClock = useEffectEvent((sid: string, questionId: string) => {
    if (!hasSubmitted.current && activeSubmission.current === sid) persist(sid, questionId, answersRef.current[questionId] ?? null);
  });
  const questionId = snapshot?.questions[currentIndex]?.id;
  useEffect(() => {
    if (loading || !snapshot || snapshot.status !== "in_progress" || !questionId) return;
    const sid = snapshot.submissionId;
    clock.current.enter(questionId, !document.hidden);
    function visibility() {
      if (document.hidden) { const id = clock.current.pause(); if (id) saveClock(sid, id); }
      else clock.current.resume();
    }
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      const id = clock.current.pause(); if (id) saveClock(sid, id);
    };
  }, [loading, snapshot, questionId]);

  useEffect(() => {
    let active = true;
    async function start() {
      setLoading(true);
      setError(null);
      try {
        const result = await callAttempts<Snapshot>(initialSubmissionId ? { action: "get", submissionId: initialSubmissionId } : { action: "start", assignmentId });
        if (!active) return;
        install(result);
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : "Could not open the assignment.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void start();
    return () => {
      active = false;
    };
  }, [assignmentId, initialSubmissionId, install]);

  useEffect(() => {
    if (!snapshot || snapshot.status !== "in_progress" || !snapshot.timeLimitMinutes) return;
    const deadline = new Date(snapshot.startedAt).getTime() + snapshot.timeLimitMinutes * 60_000;
    function tick() {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) void finish();
    }
    const immediate = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(immediate);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish is stable enough for this effect's lifetime
  }, [snapshot]);

  const currentQuestion = snapshot?.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  async function selectAnswer(choice: string) {
    if (!currentQuestion || !snapshot || snapshot.status !== "in_progress" || hasSubmitted.current || remainingSeconds === 0) return;
    clock.current.capture();
    answersRef.current = { ...answersRef.current, [currentQuestion.id]: choice };
    setAnswers(answersRef.current);
    persist(snapshot.submissionId, currentQuestion.id, choice);
  }

  async function finish() {
    if (!snapshot || hasSubmitted.current) return;
    hasSubmitted.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const id = clock.current.pause();
      if (id) persist(snapshot.submissionId, id, answersRef.current[id] ?? null);
      await pending.current;
      for (const value of [...failed.current.values()]) persist(snapshot.submissionId, value.questionId, value.answer);
      await pending.current;
      if (failed.current.size) throw new Error("Not all answers were saved. Check your connection and submit again.");
      const result = await callAttempts<Snapshot>({ action: "submit", submissionId: snapshot.submissionId });
      setSnapshot(result);
      setAnswers(result.answers);
    } catch (requestError) {
      // The response may have been lost after the transaction committed.
      try {
        const recovered = await callAttempts<Snapshot>({ action: "get", submissionId: snapshot.submissionId });
        if (recovered.status === "submitted") { failed.current.clear(); setSaveError(false); setSnapshot(recovered); setAnswers(recovered.answers); setError(null); return; }
      } catch { /* Keep the existing answers for a later retry. */ }
      hasSubmitted.current = false;
      clock.current.resume();
      setError(requestError instanceof Error ? requestError.message : "Could not submit the assignment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function retake() {
    setLoading(true); setError(null);
    try {
      const result = await callAttempts<Snapshot>({ action: "start", assignmentId, newAttempt: true });
      install(result); router.replace(`/homework/${assignmentId}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not start a retake."); }
    finally { setLoading(false); }
  }

  const active = Boolean(snapshot && snapshot.status === "in_progress" && !loading);

  return (
    <StudentShell active="homework" exam guardExit={active}>
      <main className={`homework-runner mx-auto w-full min-w-0 max-w-6xl px-4 pt-4 sm:px-6 lg:px-8 ${active ? "pb-[calc(10rem+env(safe-area-inset-bottom))] lg:pb-6" : "pb-6"}`}>
        <section className="hub-card p-4 sm:p-5">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
            href="/homework"
            onNavigate={(event) => {
              if (active && !confirmLeavingStudy()) event.preventDefault();
            }}
          >
            <ArrowLeft size={17} />
            Back to homework
          </Link>
          {snapshot ? (
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 [overflow-wrap:anywhere]">
                <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">{snapshot.title}</h1>
                {snapshot.instructions ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{snapshot.instructions}</p> : null}
                <p className="mt-2 text-sm text-slate-600">
                  Due: {formatAlmaty(snapshot.dueAt)}
                  {isPastDue(snapshot.dueAt) && snapshot.status === "in_progress" ? " · past due, will be marked as late" : ""}
                </p>
                {saveError ? <p className="mt-1 text-sm text-rose-600">Could not save your answer. Check your connection.</p> : null}
              </div>
              <div className="flex flex-wrap gap-3">
                {snapshot.status === "in_progress" && remainingSeconds !== null ? <Timer label="Time left" seconds={remainingSeconds} /> : null}
                <span className="inline-flex min-h-9 items-center rounded-full bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                  {answeredCount} / {snapshot.questions.length} answered
                </span>
              </div>
            </div>
          ) : null}
        </section>

        {snapshot && error ? <p role="alert" className="mt-4 text-sm text-rose-600">{error} {snapshot.status === "in_progress" ? <button className="cursor-pointer underline" disabled={isSubmitting} type="button" onClick={() => void finish()}>Retry submission</button> : null}</p> : null}
        {loading ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 text-sm font-semibold text-blue-600">
              <Loader2 className="animate-spin" size={20} />
              Loading assignment…
            </div>
          </section>
        ) : error && !snapshot ? (
          <EmptyState description={error} icon={<Search size={26} />} title="Assignment unavailable" />
        ) : !snapshot ? null : snapshot.status === "submitted" ? (
          <ResultView answers={answers} snapshot={snapshot} onRetake={() => void retake()} />
        ) : currentQuestion ? (
          <section className={`mt-6 grid min-w-0 gap-6 ${calculatorOpen && currentQuestion.section === "math" ? "lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]" : "lg:grid-cols-[minmax(0,1fr)_240px]"}`}>
            <div className="min-w-0 space-y-5">
              {currentQuestion.section === "math" ? (
                <button aria-expanded={calculatorOpen} className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" type="button" onClick={() => setCalculatorOpen((open) => !open)}>
                  <Calculator aria-hidden="true" size={18} /> Calculator
                </button>
              ) : null}
              <QuestionCard
                currentIndex={currentIndex}
                mode="test"
                onSelect={selectAnswer}
                question={currentQuestion}
                selectedAnswer={answers[currentQuestion.id] ?? null}
                totalQuestions={snapshot.questions.length}
              />
              <nav aria-label="Homework navigation" className="homework-navigation fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:static lg:border-0 lg:bg-transparent lg:p-0">
                <div aria-label="Questions" className="mb-2 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                  {snapshot.questions.map((question, index) => (
                    <button aria-current={index === currentIndex ? "step" : undefined} aria-label={`Question ${index + 1}${answers[question.id] ? ", answer saved" : ""}`} className={`min-h-11 min-w-11 shrink-0 cursor-pointer rounded-lg border text-sm font-semibold ${index === currentIndex ? "border-blue-600 bg-blue-600 text-white!" : answers[question.id] ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700"}`} disabled={isSubmitting} key={question.id} onClick={() => setCurrentIndex(index)} type="button">{index + 1}</button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 lg:gap-3">
                <button
                  className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-1 rounded-xl border border-blue-100 bg-white px-2 py-3 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-500"
                  disabled={isSubmitting || currentIndex === 0}
                  onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                  type="button"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <button
                  className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  disabled={isSubmitting}
                  onClick={() => submitDialog.current?.showModal()}
                  type="button"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
                  Submit
                </button>
                <button
                  className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-1 rounded-xl bg-blue-600 px-2 py-3 text-sm font-semibold text-white! shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500!"
                  disabled={isSubmitting || currentIndex === snapshot.questions.length - 1}
                  onClick={() => setCurrentIndex((index) => Math.min(snapshot.questions.length - 1, index + 1))}
                  type="button"
                >
                  Next
                  <ArrowRight size={18} />
                </button>
                </div>
              </nav>
            </div>
            <aside className="min-w-0 space-y-4">
              {calculatorOpen && currentQuestion.section === "math" ? <DesmosPanel key={currentQuestion.id} questionId={currentQuestion.id} states={calculatorStates} onClose={() => setCalculatorOpen(false)} /> : null}
              <article className="hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:block">
                <h2 className="text-lg font-semibold text-slate-950">Questions</h2>
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {snapshot.questions.map((question, index) => (
                    <button
                      className={[
                        "relative flex h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold transition",
                        index === currentIndex
                          ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                          : answers[question.id]
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                      ].join(" ")}
                      key={question.id}
                      aria-label={`Question ${index + 1}`}
                      aria-current={index === currentIndex ? "step" : undefined}
                      disabled={isSubmitting}
                      onClick={() => setCurrentIndex(index)}
                      type="button"
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                <ProgressBar className="mt-5" value={(answeredCount / Math.max(snapshot.questions.length, 1)) * 100} />
              </article>
            </aside>
          </section>
        ) : null}

        <dialog aria-labelledby="homework-submit-title" className="hub-card m-auto w-[min(28rem,calc(100%-2rem))] p-5 text-slate-950 backdrop:bg-slate-950/60 sm:p-6" ref={submitDialog}>
          <h2 className="hub-section-title" id="homework-submit-title">
            Submit assignment?
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            You answered {answeredCount} of {snapshot?.questions.length ?? 0} questions. You cannot change your answers after submitting.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={() => submitDialog.current?.close()} type="button">
              Keep working
            </button>
            <button
              className="hub-primary cursor-pointer"
              onClick={() => {
                submitDialog.current?.close();
                void finish();
              }}
              type="button"
            >
              Submit
            </button>
          </div>
        </dialog>
      </main>
    </StudentShell>
  );
}

function ResultView({ answers, snapshot, onRetake }: { answers: Record<string, string>; snapshot: Snapshot; onRetake: () => void }) {
  const percent = snapshot.totalCount ? Math.round(((snapshot.correctCount ?? 0) / snapshot.totalCount) * 100) : 0;
  return (
    <section className="mt-6 space-y-6">
      <article className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Trophy size={34} />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.12em] text-blue-600">
          {snapshot.late ? "Submitted late" : "Assignment submitted"}
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          {snapshot.correctCount ?? 0} of {snapshot.totalCount ?? 0} correct
        </h2>
        <p className="mt-2 text-lg font-bold text-slate-600">{percent}% accuracy</p>
        <ProgressBar className="mx-auto mt-5 max-w-md" value={percent} />
        {snapshot.submittedAt ? <p className="mt-4 text-sm text-slate-500">Submitted: {formatAlmaty(snapshot.submittedAt)}</p> : null}
      </article>
      {snapshot.canRetake ? <button className="hub-primary cursor-pointer" type="button" onClick={onRetake}>Start a retake</button> : null}
      <AssignmentFeedbackList feedback={snapshot.feedback ?? []} questionIds={snapshot.questions.map((q) => q.id)} />
      {snapshot.feedbackError ? <p className="text-sm text-slate-600">Comments are temporarily unavailable. Refresh the page to try again.</p> : null}
      {snapshot.review ? (
        <ReviewAnswers answers={answers} questions={snapshot.review} />
      ) : (
        <div className="hub-card p-5 text-sm text-slate-600">
          {snapshot.showAnswers === "never"
            ? "Your teacher has hidden the answer review for this assignment."
            : snapshot.showAnswers === "after_due"
              ? snapshot.dueAt ? `The answer review opens after the due date (${formatAlmaty(snapshot.dueAt)}).` : "The answer review is unavailable until your teacher sets a due date and it passes."
              : snapshot.dueAt ? `The answer review opens after your attempts run out or the due date passes (${formatAlmaty(snapshot.dueAt)}).` : "The answer review opens after you use all available attempts."}
        </div>
      )}
    </section>
  );
}
