"use client";

import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import type { Question } from "@/data/questions";

type PracticeQuizProps = {
  questions: Question[];
};

const sectionLabels = {
  math: "Math",
  "reading-writing": "Reading and Writing"
};

const difficultyStyles = {
  easy: "border-teal-100 bg-teal-50 text-teal-700",
  medium: "border-amber-100 bg-amber-50 text-amber-700",
  hard: "border-rose-100 bg-rose-50 text-rose-700"
};

export function PracticeQuiz({ questions }: PracticeQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const hasAnswered = selectedAnswer !== null;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
  const percentage =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  function handleSelect(choice: string) {
    if (hasAnswered) {
      return;
    }

    setSelectedAnswer(choice);

    if (choice === currentQuestion.correctAnswer) {
      setCorrectCount((count) => count + 1);
    }
  }

  function handleNextQuestion() {
    if (!hasAnswered) {
      return;
    }

    if (isLastQuestion) {
      setIsFinished(true);
      return;
    }

    setCurrentIndex((index) => index + 1);
    setSelectedAnswer(null);
  }

  function handleRestart() {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setCorrectCount(0);
    setIsFinished(false);
  }

  if (totalQuestions === 0) {
    return (
      <Card className="mt-10">
        <h2 className="text-xl font-bold text-neutral-950">No questions yet</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Add questions to the local question bank to start practicing.
        </p>
      </Card>
    );
  }

  if (isFinished) {
    return (
      <Card className="mt-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-teal-100 bg-teal-50 text-teal-700">
            <CheckCircle2 size={28} />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-normal text-neutral-500">
            Practice complete
          </p>
          <h2 className="mt-2 text-3xl font-bold text-neutral-950">
            {correctCount} of {totalQuestions} correct
          </h2>
          <p className="mt-3 text-lg font-semibold text-teal-700">
            Score: {percentage}%
          </p>
          <p className="mt-4 text-sm leading-6 text-neutral-600">
            Review your explanations as you practice, then restart when you want
            another clean pass through the set.
          </p>
          <div className="mt-8 flex justify-center">
            <Button icon={<RotateCcw size={18} />} onClick={handleRestart}>
              Restart Practice
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mt-10 hover:translate-y-0">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-500">
              Question {currentIndex + 1} of {totalQuestions}
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100 sm:w-72">
              <div
                className="h-full rounded-full bg-teal-600 transition-all"
                style={{
                  width: `${((currentIndex + 1) / totalQuestions) * 100}%`
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-700">
              {sectionLabels[currentQuestion.section]}
            </span>
            <span
              className={[
                "rounded-md border px-2.5 py-1 text-xs font-semibold capitalize",
                difficultyStyles[currentQuestion.difficulty]
              ].join(" ")}
            >
              {currentQuestion.difficulty}
            </span>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-6">
          <h2 className="text-2xl font-bold leading-9 text-neutral-950">
            {currentQuestion.question}
          </h2>

          <div className="mt-6 grid gap-3">
            {currentQuestion.choices.map((choice, choiceIndex) => {
              const isSelected = selectedAnswer === choice;
              const isAnswer = currentQuestion.correctAnswer === choice;
              const optionState =
                hasAnswered && isAnswer
                  ? "border-teal-400 bg-teal-50 text-teal-950 ring-1 ring-teal-300"
                  : hasAnswered && isSelected
                    ? "border-rose-300 bg-rose-50 text-rose-950 ring-1 ring-rose-200"
                    : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50";

              return (
                <button
                  className={[
                    "flex min-h-14 w-full items-start gap-3 rounded-md border px-4 py-3 text-left text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 disabled:cursor-default",
                    optionState
                  ].join(" ")}
                  disabled={hasAnswered}
                  key={choice}
                  onClick={() => handleSelect(choice)}
                  type="button"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold text-neutral-900 ring-1 ring-inset ring-neutral-200">
                    {String.fromCharCode(65 + choiceIndex)}
                  </span>
                  <span className="leading-7">{choice}</span>
                </button>
              );
            })}
          </div>
        </div>

        {hasAnswered ? (
          <div
            className={[
              "rounded-lg border p-5",
              isCorrect
                ? "border-teal-100 bg-teal-50 text-teal-950"
                : "border-rose-100 bg-rose-50 text-rose-950"
            ].join(" ")}
          >
            <div className="flex items-center gap-2 text-sm font-bold">
              {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              <span>{isCorrect ? "Correct answer" : "Not quite"}</span>
            </div>
            <p className="mt-3 text-sm leading-6">
              Correct answer:{" "}
              <span className="font-semibold">{currentQuestion.correctAnswer}</span>
            </p>
            <p className="mt-2 text-sm leading-6">{currentQuestion.explanation}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 text-sm leading-6 text-neutral-600">
            Choose one answer. After you select it, the explanation will appear
            and the answer will be locked.
          </div>
        )}

        <div className="flex justify-end">
          <Button
            disabled={!hasAnswered}
            icon={<ArrowRight size={18} />}
            onClick={handleNextQuestion}
          >
            {isLastQuestion ? "Show Result" : "Next Question"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
