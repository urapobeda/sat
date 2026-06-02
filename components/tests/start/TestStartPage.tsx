"use client";

import { ArrowLeft, ArrowRight, Flag, RotateCcw, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ReviewAnswers } from "@/components/quiz/ReviewAnswers";
import { Timer } from "@/components/quiz/Timer";
import { questions } from "@/data/questions";
import { getWeakTopics } from "@/lib/questions";
import { saveTestResult } from "@/lib/progress";

const TEST_DURATION_SECONDS = 15 * 60;

export function TestStartPage() {
  const testQuestions = useMemo(() => getMiniTestQuestions(), []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(TEST_DURATION_SECONDS);
  const [isFinished, setIsFinished] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
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
  const weakTopics = getWeakTopics(testQuestions, answers);

  useEffect(() => {
    if (isFinished) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => {
        if (seconds <= 1) {
          window.setTimeout(() => finishTest(true), 0);
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

  function finishTest(expired: boolean) {
    if (!hasSaved.current) {
      saveTestResult({
        estimatedScore,
        percentage,
        score,
        timeSpent: expired ? TEST_DURATION_SECONDS : timeSpent,
        total: testQuestions.length,
        weakTopics
      });
      hasSaved.current = true;
    }

    setTimeUp(expired);
    setIsFinished(true);
  }

  function restartTest() {
    setAnswers({});
    setCurrentIndex(0);
    setRemainingSeconds(TEST_DURATION_SECONDS);
    setIsFinished(false);
    setTimeUp(false);
    hasSaved.current = false;
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
          </div>
          <Timer seconds={remainingSeconds} />
        </div>
      </section>

      {isFinished ? (
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
              onClick={() => finishTest(false)}
              type="button"
            >
              <Flag size={17} />
              Finish Test
            </button>

            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 sm:justify-self-end"
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

function getMiniTestQuestions() {
  const math = questions.filter((question) => question.section === "math").slice(0, 5);
  const readingWriting = questions
    .filter((question) => question.section === "reading-writing")
    .slice(0, 5);

  return [...math, ...readingWriting];
}
