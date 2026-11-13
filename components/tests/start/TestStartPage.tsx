"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Flag,
  Loader2,
  Search,
  Send,
  Sparkles,
  Trophy
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createTestDraftStore } from "@/lib/testDraft";
import { AITutorPanel } from "@/components/ai-tutor/AITutorPanel";
import { EmptyState } from "@/components/EmptyState";
import { confirmLeavingStudy, StudentShell } from "@/components/dashboard/StudentShell";
import { QuestionNavigator } from "@/components/question-bank/practice/QuestionNavigator";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ReviewAnswers } from "@/components/quiz/ReviewAnswers";
import { Timer, formatTime } from "@/components/quiz/Timer";
import {
  createTestSession,
  getCurrentUser,
  getQuestionDetails,
  getRandomQuestions
} from "@/lib/supabase/queries";
import { getSupabaseAuthHeaders } from "@/lib/supabase/authHeaders";
import type { Question, ReviewQuestion } from "@/types/sat";

const TEST_DURATION_SECONDS = 65 * 60;
const TEST_QUESTION_LIMIT = 40;

type TestCompletionResult = {
  estimatedSatScore: number;
  percentage: number;
  reviewQuestions: ReviewQuestion[];
  score: number;
  total: number;
};

const EMPTY_TEST_FEEDBACK = {};
const testDraftStore = createTestDraftStore(() => window.localStorage);

export function TestStartPage() {
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [testSessionId, setTestSessionId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(TEST_DURATION_SECONDS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(null);
  const [reviewQuestion, setReviewQuestion] = useState<ReviewQuestion | null>(null);
  const [completionResult, setCompletionResult] = useState<TestCompletionResult | null>(null);
  const submitDialog = useRef<HTMLDialogElement>(null);
  const hasSaved = useRef(false);
  const expirySubmitted = useRef(false);

  const currentQuestion = testQuestions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] ?? null : null;
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;
  const timeSpent = TEST_DURATION_SECONDS - remainingSeconds;
  const score = completionResult?.score ?? 0;
  const percentage = completionResult?.percentage ?? 0;
  const estimatedScore = completionResult?.estimatedSatScore ?? 0;

  useEffect(() => {
    let isMounted = true;

    async function loadFullTest() {
      setIsLoading(true);
      setError(null);
      setPersistenceMessage(null);
      setReviewQuestion(null);

      try {
        const user = await getCurrentUser().catch(() => null);
        if (!isMounted) return;
        const saved = testDraftStore.read(user?.id);
        const draft = saved?.draft;
        const loadedQuestions = draft ? await getQuestionDetails(draft.questions) : await getRandomQuestions(TEST_QUESTION_LIMIT);
        if (!isMounted) return;
        if (draft && loadedQuestions.length !== draft.questions.length) {
          throw new Error("Some saved test questions are unavailable. The draft is still saved.");
        }

        let sessionId = draft?.sessionId ?? null;
        if (!draft && user && loadedQuestions.length > 0) {
          const session = await createTestSession({ mode: "full", total: loadedQuestions.length, user_id: user.id });
          sessionId = session.id;
        }
        if (!isMounted) return;

        const deadline = draft?.endsAt ?? Date.now() + TEST_DURATION_SECONDS * 1000;
        setTestQuestions(loadedQuestions);
        setCurrentUser(user);
        setTestSessionId(sessionId);
        setDraftId(saved?.id ?? sessionId ?? crypto.randomUUID());
        setEndsAt(deadline);
        setRemainingSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
        if (draft) {
          setAnswers(draft.answers);
          setFlaggedQuestions(draft.flags);
          setCurrentIndex(Math.min(draft.index, loadedQuestions.length - 1));
        }
        if (!user) setPersistenceMessage("Guest mode: sign in to save this test result.");
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load test questions from Supabase."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadFullTest();

    return () => {
      isMounted = false;
    };
  }, []);

  const submitOnExpiry = useEffectEvent(() => {
    if (expirySubmitted.current) return;
    submitDialog.current?.close();
    expirySubmitted.current = true;
    void finishTest(true);
  });

  useEffect(() => {
    if (isFinished || isLoading || endsAt === null || !testQuestions.length) return;

    const deadline = endsAt;
    function updateTimer() {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) submitOnExpiry();
    }

    const timer = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(timer);
  }, [endsAt, isFinished, isLoading, testQuestions.length]);

  useEffect(() => {
    if (isFinished || isLoading || endsAt === null || !testQuestions.length) return;
    if (!draftId || hasSaved.current) return;
    testDraftStore.save(currentUser?.id, draftId, {
      questions: testQuestions.map((question) => question.id),
      sessionId: testSessionId, endsAt, answers, flags: flaggedQuestions, index: currentIndex
    });
  }, [answers, currentIndex, currentUser?.id, draftId, endsAt, flaggedQuestions, isFinished, isLoading, testQuestions, testSessionId]);

  function selectAnswer(choice: string) {
    if (!currentQuestion || remainingSeconds === 0 || hasSaved.current) {
      return;
    }

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [currentQuestion.id]: choice
    }));
  }

  function goNext() {
    setCurrentIndex((index) => Math.min(index + 1, testQuestions.length - 1));
  }

  function goPrevious() {
    setCurrentIndex((index) => Math.max(index - 1, 0));
  }

  function toggleFlag() {
    if (!currentQuestion) {
      return;
    }

    setFlaggedQuestions((currentFlags) => ({
      ...currentFlags,
      [currentQuestion.id]: !currentFlags[currentQuestion.id]
    }));
  }

  async function finishTest(expired: boolean) {
    if (hasSaved.current) return;

    hasSaved.current = true;
    setIsSavingResult(true);
    const secondsUntilDeadline = endsAt === null ? remainingSeconds : Math.ceil((endsAt - Date.now()) / 1000);
    const spentSeconds = expired ? TEST_DURATION_SECONDS : TEST_DURATION_SECONDS - Math.min(TEST_DURATION_SECONDS, Math.max(0, secondsUntilDeadline));

    try {
      const authHeaders = currentUser ? await getSupabaseAuthHeaders() : {};
      const response = await fetch("/api/tests/complete", {
        body: JSON.stringify({
          answers: Object.fromEntries(
            testQuestions.map((question) => [
              question.id,
              answers[question.id] ?? null
            ])
          ),
          testSessionId,
          timeSpentSeconds: spentSeconds
        }),
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Unable to complete test.");
      }

      setCompletionResult((await response.json()) as TestCompletionResult);
      if (draftId) testDraftStore.clear(currentUser?.id, draftId);
    } catch {
      hasSaved.current = false;
      setPersistenceMessage("The test could not be submitted. Please try again.");
      return;
    } finally {
      setIsSavingResult(false);
    }

    setTimeUp(expired);
    setIsFinished(true);
  }

  const activeTest = !isLoading && !isFinished && testQuestions.length > 0;
  return (
    <StudentShell active="tests" exam guardExit={activeTest}>
    <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
      <section className="hub-card p-4 sm:p-5">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
          href="/tests"
          onNavigate={(event) => { if (activeTest && !confirmLeavingStudy()) event.preventDefault(); }}
        >
          <ArrowLeft size={17} />
          Back to Tests
        </Link>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">
              Timed SAT Practice
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Work through a randomized SAT-style test. Answers and explanations
              unlock after you submit.
            </p>
            {persistenceMessage ? (
              <p className="mt-4 inline-flex rounded-2xl border border-blue-100 bg-white/80 px-4 py-2 text-sm font-bold text-slate-600">
                {persistenceMessage}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Timer seconds={remainingSeconds} />
            <span className="inline-flex min-h-9 items-center rounded-full bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
              {answeredCount} / {testQuestions.length} answered
            </span>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-semibold text-blue-600">
            <Loader2 className="animate-spin" size={20} />
            Loading full SAT test from Supabase...
          </div>
          <div className="mt-6 space-y-4">
            {[0, 1, 2].map((item) => (
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" key={item} />
            ))}
          </div>
        </section>
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : testQuestions.length === 0 ? (
        <EmptyState
          description="No questions are available in Supabase yet. Run the seed SQL file first."
          icon={<Search size={26} />}
          title="No test questions found"
        />
      ) : isFinished ? (
        <section
          className={[
            "mt-6 grid gap-6",
            reviewQuestion ? "lg:grid-cols-[minmax(0,1fr)_420px]" : ""
          ].join(" ")}
        >
          <div className="space-y-6">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Trophy size={34} />
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.12em] text-blue-600">
              {timeUp ? "Time is up" : "Test submitted"}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950">
              Unofficial SAT Score Estimate: {estimatedScore}
            </h2>
            <p className="mt-2 text-lg font-bold text-slate-600">
              {score} of {testQuestions.length} correct • {percentage}% accuracy
            </p>
            <ProgressBar className="mx-auto mt-5 max-w-md" value={percentage} />

            <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-4">
              <ResultMetric label="Time" value={formatTime(timeSpent)} />
              <ResultMetric label="Answered" value={`${answeredCount}`} />
              <ResultMetric label="Flagged" value={`${flaggedCount}`} />
              <ResultMetric label="Wrong" value={`${testQuestions.length - score}`} />
            </div>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                href="/tests/start"
              >
                Start New Test
                <ArrowRight size={18} />
              </Link>
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl"
                onClick={() => {
                  const missedQuestion =
                    completionResult?.reviewQuestions.find(
                      (question) => !question.isCorrect
                    ) ?? completionResult?.reviewQuestions[0];
                  if (!missedQuestion) {
                    return;
                  }
                  setReviewQuestion(missedQuestion);
                }}
                type="button"
              >
                <Sparkles size={18} />
                Review with AI
              </button>
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                href="/progress"
              >
                View Progress
              </Link>
            </div>
            </article>

            <ReviewAnswers
              answers={answers}
              questions={completionResult?.reviewQuestions ?? []}
            />
          </div>
          {reviewQuestion ? (
            <AITutorPanel
              hasSubmittedOverride
              isOpen={Boolean(reviewQuestion)}
              key={reviewQuestion.id}
              onClose={() => setReviewQuestion(null)}
              question={reviewQuestion}
              selectedAnswer={answers[reviewQuestion.id] ?? null}
            />
          ) : null}
        </section>
      ) : currentQuestion ? (
        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div className="hub-card flex flex-wrap items-center justify-between gap-3 p-3">
              <QuestionNavigator currentIndex={currentIndex} disabled={isSavingResult} feedback={EMPTY_TEST_FEEDBACK} answers={answers} marked={testQuestions.flatMap((question, index) => flaggedQuestions[question.id] ? [index] : [])} onShowQuestion={setCurrentIndex} position="below" questions={testQuestions} />
              <span className="text-sm font-medium text-slate-600">{answeredCount} answered · {flaggedCount} marked for review</span>
            </div>
            <QuestionCard
              currentIndex={currentIndex}
              mode="test"
              onSelect={selectAnswer}
              question={currentQuestion}
              selectedAnswer={selectedAnswer}
              totalQuestions={testQuestions.length}
            />

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_1fr] sm:items-center">
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-5 py-3 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={currentIndex === 0}
                onClick={goPrevious}
                type="button"
              >
                <ArrowLeft size={18} />
                Previous
              </button>

              <button
                className={[
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold shadow-sm transition",
                  flaggedQuestions[currentQuestion.id]
                    ? "border-orange-200 bg-orange-50 text-orange-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50"
                ].join(" ")}
                onClick={toggleFlag}
                type="button"
              >
                <Flag size={17} />
                {flaggedQuestions[currentQuestion.id] ? "Flagged" : "Flag"}
              </button>

              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-100 bg-white px-5 py-3 text-sm font-semibold text-rose-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                disabled={isSavingResult}
                onClick={() => submitDialog.current?.showModal()}
                type="button"
              >
                {isSavingResult ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
                Submit Test
              </button>

              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:justify-self-end"
                disabled={currentIndex === testQuestions.length - 1}
                onClick={goNext}
                type="button"
              >
                Next
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          <aside className="space-y-4">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Question Navigator</h2>
              <p className="mt-1 text-sm text-slate-600">
                Jump between questions before submitting.
              </p>
              <div className="mt-5 grid grid-cols-5 gap-2">
                {testQuestions.map((question, index) => {
                  const isCurrent = index === currentIndex;
                  const isAnswered = Boolean(answers[question.id]);
                  const isFlagged = Boolean(flaggedQuestions[question.id]);

                  return (
                    <button
                      className={[
                        "relative flex h-11 items-center justify-center rounded-xl border text-sm font-semibold transition",
                        isCurrent
                          ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                          : isAnswered
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                      ].join(" ")}
                      key={question.id}
                      onClick={() => setCurrentIndex(index)}
                      type="button"
                    >
                      {index + 1}
                      {isFlagged ? (
                        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-orange-500 ring-2 ring-white" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Test Progress</h2>
              <ProgressBar
                className="mt-4"
                value={(answeredCount / Math.max(testQuestions.length, 1)) * 100}
              />
              <div className="mt-4 grid gap-3 text-sm font-bold text-slate-600">
                <span className="flex items-center justify-between">
                  Answered <strong className="text-slate-950">{answeredCount}</strong>
                </span>
                <span className="flex items-center justify-between">
                  Remaining{" "}
                  <strong className="text-slate-950">
                    {testQuestions.length - answeredCount}
                  </strong>
                </span>
                <span className="flex items-center justify-between">
                  Flagged <strong className="text-slate-950">{flaggedCount}</strong>
                </span>
              </div>
            </article>
          </aside>
        </section>
      ) : null}
      <dialog aria-labelledby="test-submit-title" className="hub-card m-auto w-[min(28rem,calc(100%-2rem))] p-5 text-slate-950 backdrop:bg-slate-950/60 sm:p-6" ref={submitDialog}>
        <h2 className="hub-section-title" id="test-submit-title">Submit your test?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          You answered {answeredCount} of {testQuestions.length} questions. Your answers will be locked when you submit.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={() => submitDialog.current?.close()} type="button">Keep working</button>
          <button className="hub-primary cursor-pointer" onClick={() => {
            submitDialog.current?.close();
            void finishTest(remainingSeconds === 0);
          }} type="button">Submit answers</button>
        </div>
      </dialog>
    </main>
    </StudentShell>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <article className="mt-6 rounded-3xl border border-rose-100 bg-rose-50 p-6 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-rose-600">
        <CheckCircle2 size={28} />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-rose-900">Test is unavailable</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-rose-700">
        {message}
      </p>
      <button
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700"
        onClick={onRetry}
        type="button"
      >
        Retry
      </button>
    </article>
  );
}
