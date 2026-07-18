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
import { useEffect, useRef, useState } from "react";
import { AITutorPanel } from "@/components/ai-tutor/AITutorPanel";
import { EmptyState } from "@/components/EmptyState";
import { Layout } from "@/components/Layout";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ReviewAnswers } from "@/components/quiz/ReviewAnswers";
import { Timer, formatTime } from "@/components/quiz/Timer";
import {
  completeTestSession,
  createTestSession,
  getCurrentUser,
  getRandomQuestions,
  saveTestAnswer
} from "@/lib/supabase/queries";
import type { Question } from "@/types/sat";

const TEST_DURATION_SECONDS = 65 * 60;
const TEST_QUESTION_LIMIT = 40;

export function TestStartPage() {
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [testSessionId, setTestSessionId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(TEST_DURATION_SECONDS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(null);
  const [reviewQuestion, setReviewQuestion] = useState<Question | null>(null);
  const hasSaved = useRef(false);

  const currentQuestion = testQuestions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] ?? null : null;
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;
  const score = testQuestions.filter(
    (question) => answers[question.id] === question.correctAnswer
  ).length;
  const percentage =
    testQuestions.length > 0 ? Math.round((score / testQuestions.length) * 100) : 0;
  const timeSpent = TEST_DURATION_SECONDS - remainingSeconds;
  const estimatedScore = Math.min(1600, Math.max(400, 400 + Math.round(percentage * 12)));

  useEffect(() => {
    let isMounted = true;

    async function loadFullTest() {
      setIsLoading(true);
      setError(null);
      setPersistenceMessage(null);
      setReviewQuestion(null);

      try {
        const [loadedQuestions, user] = await Promise.all([
          getRandomQuestions(TEST_QUESTION_LIMIT),
          getCurrentUser().catch(() => null)
        ]);

        if (!isMounted) {
          return;
        }

        setTestQuestions(loadedQuestions);
        setCurrentUser(user);

        if (!user) {
          setPersistenceMessage("Guest mode: sign in to save this test result.");
          return;
        }

        if (loadedQuestions.length > 0) {
          const session = await createTestSession({
            mode: "full",
            total: loadedQuestions.length,
            user_id: user.id
          });

          if (isMounted) {
            setTestSessionId(session.id);
          }
        }
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

  useEffect(() => {
    if (isFinished || isLoading || testQuestions.length === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => {
        if (seconds <= 1) {
          window.setTimeout(() => {
            finishTest(true);
          }, 0);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  });

  function selectAnswer(choice: string) {
    if (!currentQuestion) {
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
    if (hasSaved.current) {
      setTimeUp(expired);
      setIsFinished(true);
      return;
    }

    hasSaved.current = true;
    setIsSavingResult(true);
    const spentSeconds = expired ? TEST_DURATION_SECONDS : timeSpent;

    try {
      if (currentUser && testSessionId) {
        await Promise.all(
          testQuestions.map((question) =>
            saveTestAnswer({
              correct_answer: question.correctAnswer,
              is_correct: answers[question.id] === question.correctAnswer,
              question_id: question.id,
              selected_answer: answers[question.id] ?? null,
              test_session_id: testSessionId,
              user_id: currentUser.id
            })
          )
        );

        await completeTestSession(testSessionId, {
          estimated_sat_score: estimatedScore,
          percentage,
          score,
          time_spent_seconds: spentSeconds,
          total: testQuestions.length
        });
      }
    } catch {
      setPersistenceMessage("Results are shown here, but Supabase did not save them.");
    } finally {
      setIsSavingResult(false);
      setTimeUp(expired);
      setIsFinished(true);
    }
  }

  return (
    <Layout>
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-white p-6 shadow-soft sm:p-8">
        <Link
          className="inline-flex items-center gap-2 text-sm font-black text-blue-600 transition hover:text-blue-700"
          href="/tests"
        >
          <ArrowLeft size={17} />
          Back to Tests
        </Link>
        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              Full SAT Test
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
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
            <span className="inline-flex min-h-9 items-center rounded-full bg-white px-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200">
              {answeredCount} / {testQuestions.length} answered
            </span>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-black text-blue-600">
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
            <p className="mt-5 text-sm font-black uppercase tracking-[0.12em] text-blue-600">
              {timeUp ? "Time is up" : "Test submitted"}
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Estimated SAT Score: {estimatedScore}
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
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                href="/tests/start"
              >
                Start New Test
                <ArrowRight size={18} />
              </Link>
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl"
                onClick={() => {
                  const missedQuestion =
                    testQuestions.find(
                      (question) => answers[question.id] !== question.correctAnswer
                    ) ?? testQuestions[0];
                  setReviewQuestion(missedQuestion);
                }}
                type="button"
              >
                <Sparkles size={18} />
                Review with AI
              </button>
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                href="/progress"
              >
                View Progress
              </Link>
            </div>
            </article>

            <ReviewAnswers answers={answers} questions={testQuestions} />
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
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-5 py-3 text-sm font-black text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={currentIndex === 0}
                onClick={goPrevious}
                type="button"
              >
                <ArrowLeft size={18} />
                Previous
              </button>

              <button
                className={[
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black shadow-sm transition",
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
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-100 bg-white px-5 py-3 text-sm font-black text-rose-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                disabled={isSavingResult}
                onClick={() => finishTest(false)}
                type="button"
              >
                {isSavingResult ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
                Submit Test
              </button>

              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:justify-self-end"
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
              <h2 className="text-lg font-black text-slate-950">Question Navigator</h2>
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
                        "relative flex h-11 items-center justify-center rounded-xl border text-sm font-black transition",
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
              <h2 className="text-lg font-black text-slate-950">Test Progress</h2>
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
    </Layout>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
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
      <h2 className="mt-4 text-xl font-black text-rose-900">Test is unavailable</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-rose-700">
        {message}
      </p>
      <button
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-600 px-5 text-sm font-black text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700"
        onClick={onRetry}
        type="button"
      >
        Retry
      </button>
    </article>
  );
}
