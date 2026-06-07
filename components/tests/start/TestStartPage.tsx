"use client";

import {
  ArrowLeft,
  ArrowRight,
  Flag,
  Loader2,
  RotateCcw,
  Search,
  Trophy
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { EmptyState } from "@/components/EmptyState";
import { Layout } from "@/components/Layout";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ReviewAnswers } from "@/components/quiz/ReviewAnswers";
import { Timer } from "@/components/quiz/Timer";
import type { Question } from "@/data/questions";
import {
  completeTestSession,
  createTestSession,
  getCurrentUser,
  getRandomQuestions,
  saveTestAnswer
} from "@/lib/supabase/queries";

const TEST_DURATION_SECONDS = 15 * 60;

export function TestStartPage() {
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [testSessionId, setTestSessionId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(TEST_DURATION_SECONDS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(null);
  const hasSaved = useRef(false);

  const currentQuestion = testQuestions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] ?? null : null;
  const score = testQuestions.filter(
    (question) => answers[question.id] === question.correctAnswer
  ).length;
  const percentage =
    testQuestions.length > 0 ? Math.round((score / testQuestions.length) * 100) : 0;
  const timeSpent = TEST_DURATION_SECONDS - remainingSeconds;
  const estimatedScore = Math.min(1600, 400 + Math.round(percentage * 12));

  useEffect(() => {
    let isMounted = true;

    async function loadMiniTest() {
      setIsLoading(true);
      setError(null);
      setPersistenceMessage(null);

      try {
        const [loadedQuestions, user] = await Promise.all([
          getRandomQuestions(10),
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
            mode: "mini",
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
              : "Unable to load mini test questions."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMiniTest();

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
    if (currentIndex === testQuestions.length - 1) {
      finishTest(false);
      return;
    }

    setCurrentIndex((index) => Math.min(index + 1, testQuestions.length - 1));
  }

  function goPrevious() {
    setCurrentIndex((index) => Math.max(index - 1, 0));
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

  async function restartTest() {
    setAnswers({});
    setCurrentIndex(0);
    setRemainingSeconds(TEST_DURATION_SECONDS);
    setIsFinished(false);
    setTimeUp(false);
    hasSaved.current = false;

    if (!currentUser) {
      return;
    }

    try {
      const session = await createTestSession({
        mode: "mini",
        total: testQuestions.length,
        user_id: currentUser.id
      });
      setTestSessionId(session.id);
    } catch {
      setPersistenceMessage("Test restarted, but the new session was not saved.");
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
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              SAT Mini Test
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              Answer each question under timed conditions. Explanations unlock
              after you finish.
            </p>
            {persistenceMessage ? (
              <p className="mt-4 inline-flex rounded-2xl border border-blue-100 bg-white/80 px-4 py-2 text-sm font-bold text-slate-600">
                {persistenceMessage}
              </p>
            ) : null}
          </div>
          <Timer seconds={remainingSeconds} />
        </div>
      </section>

      {isLoading ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-black text-blue-600">
            <Loader2 className="animate-spin" size={20} />
            Loading mini test from Supabase...
          </div>
          <div className="mt-6 space-y-4">
            {[0, 1, 2].map((item) => (
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" key={item} />
            ))}
          </div>
        </section>
      ) : error ? (
        <EmptyState
          description={error}
          icon={<Search size={26} />}
          title="Mini test is unavailable"
        />
      ) : testQuestions.length === 0 ? (
        <EmptyState
          description="No questions are available in Supabase yet. Run the seed SQL file first."
          icon={<Search size={26} />}
          title="No test questions found"
        />
      ) : isFinished ? (
        <section className="mt-6 space-y-6">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Trophy size={34} />
            </div>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.12em] text-blue-600">
              {timeUp ? "Time is up" : "Test complete"}
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              {score} of {testQuestions.length} correct
            </h2>
            <p className="mt-2 text-4xl font-black text-blue-600">
              {percentage}%
            </p>
            <p className="mt-2 text-lg font-bold text-slate-600">
              Estimated SAT score: {estimatedScore} / 1600
            </p>
            <ProgressBar className="mx-auto mt-5 max-w-md" value={percentage} />
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                onClick={restartTest}
                type="button"
              >
                <RotateCcw size={18} />
                Restart Test
              </button>
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                href="/progress"
              >
                View Progress
                <ArrowRight size={18} />
              </Link>
            </div>
          </article>

          <ReviewAnswers answers={answers} questions={testQuestions} />
        </section>
      ) : currentQuestion ? (
        <section className="mt-6 space-y-5">
          <QuestionCard
            currentIndex={currentIndex}
            mode="test"
            onSelect={selectAnswer}
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            timerSeconds={remainingSeconds}
            totalQuestions={testQuestions.length}
          />

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
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
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-100 bg-white px-5 py-3 text-sm font-black text-rose-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50"
              disabled={isSavingResult}
              onClick={() => finishTest(false)}
              type="button"
            >
              {isSavingResult ? <Loader2 className="animate-spin" size={17} /> : <Flag size={17} />}
              Finish Test
            </button>

            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 sm:justify-self-end"
              disabled={isSavingResult}
              onClick={goNext}
              type="button"
            >
              {currentIndex === testQuestions.length - 1 ? "Finish" : "Next"}
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      ) : null}
    </Layout>
  );
}
