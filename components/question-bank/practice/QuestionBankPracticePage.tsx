"use client";

import { ArrowLeft, ArrowRight, Search, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { Layout } from "@/components/Layout";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ResultsCard } from "@/components/quiz/ResultsCard";
import { questions } from "@/data/questions";
import {
  filterQuestions,
  formatSection,
  getWeakTopics,
  normalizeTopic,
  type DifficultyFilter,
  type SectionFilter
} from "@/lib/questions";
import { savePracticeResult } from "@/lib/progress";

export function QuestionBankPracticePage() {
  const searchParams = useSearchParams();
  const section = parseSection(searchParams.get("section"));
  const difficulty = parseDifficulty(searchParams.get("difficulty"));
  const topicParam = searchParams.get("topic");
  const topic = resolveTopic(topicParam);
  const filteredQuestions = useMemo(
    () =>
      filterQuestions(questions, {
        difficulty,
        section,
        topic
      }),
    [difficulty, section, topic]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const hasSaved = useRef(false);

  const currentQuestion = filteredQuestions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] ?? null : null;
  const score = filteredQuestions.filter(
    (question) => answers[question.id] === question.correctAnswer
  ).length;
  const percentage =
    filteredQuestions.length > 0
      ? Math.round((score / filteredQuestions.length) * 100)
      : 0;
  const weakTopics = getWeakTopics(filteredQuestions, answers);

  function handleSelect(choice: string) {
    if (!currentQuestion || answers[currentQuestion.id]) {
      return;
    }

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [currentQuestion.id]: choice
    }));
  }

  function handleNext() {
    if (currentIndex === filteredQuestions.length - 1) {
      finishPractice();
      return;
    }

    setCurrentIndex((index) => Math.min(index + 1, filteredQuestions.length - 1));
  }

  function handlePrevious() {
    setCurrentIndex((index) => Math.max(index - 1, 0));
  }

  function finishPractice() {
    if (!hasSaved.current) {
      savePracticeResult({
        difficulty,
        percentage,
        score,
        section,
        topic: topic ?? undefined,
        total: filteredQuestions.length,
        weakTopics
      });
      hasSaved.current = true;
    }

    setIsFinished(true);
  }

  function restartPractice() {
    setAnswers({});
    setCurrentIndex(0);
    setIsFinished(false);
    hasSaved.current = false;
  }

  return (
    <Layout>
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-white p-6 shadow-soft sm:p-8">
        <Link
          className="inline-flex items-center gap-2 text-sm font-black text-blue-600 transition hover:text-blue-700"
          href="/question-bank"
        >
          <ArrowLeft size={17} />
          Back to Question Bank
        </Link>
        <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
          Practice Mode
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
          {formatSection(section)}
          {topic ? ` / ${topic}` : ""} practice with instant explanations.
        </p>
      </section>

      {filteredQuestions.length === 0 ? (
        <EmptyState
          description="No questions match these filters. Go back and choose another section or topic."
          icon={<Search size={26} />}
          title="No questions found"
        />
      ) : isFinished ? (
        <section className="mt-6">
          <ResultsCard
            onRestart={restartPractice}
            percentage={percentage}
            score={score}
            total={filteredQuestions.length}
            weakTopics={weakTopics}
          />
        </section>
      ) : currentQuestion ? (
        <section className="mt-6 space-y-5">
          <QuestionCard
            currentIndex={currentIndex}
            onSelect={handleSelect}
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            showFeedback={selectedAnswer !== null}
            totalQuestions={filteredQuestions.length}
          />

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-5 py-3 text-sm font-black text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={currentIndex === 0}
              onClick={handlePrevious}
              type="button"
            >
              <ArrowLeft size={18} />
              Previous
            </button>

            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              onClick={restartPractice}
              type="button"
            >
              <RotateCcw size={17} />
              Restart
            </button>

            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none sm:justify-self-end"
              disabled={!selectedAnswer}
              onClick={handleNext}
              type="button"
            >
              {currentIndex === filteredQuestions.length - 1
                ? "Show Results"
                : "Next"}
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      ) : null}
    </Layout>
  );
}

function parseSection(value: string | null): SectionFilter {
  return value === "math" || value === "reading-writing" ? value : "all";
}

function parseDifficulty(value: string | null): DifficultyFilter {
  return value === "easy" || value === "medium" || value === "hard"
    ? value
    : "all";
}

function resolveTopic(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = normalizeTopic(value);
  const match = questions.find((question) => normalizeTopic(question.topic) === normalized);

  return match?.topic ?? value;
}
