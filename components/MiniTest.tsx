"use client";

import { Clock, Flag } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { QuestionCard } from "@/components/QuestionCard";
import { TestResultsCard } from "@/components/TestResultsCard";
import type { Question } from "@/data/questions";
import { saveProgressRecord } from "@/lib/progress";

type MiniTestProps = {
  questions: Question[];
};

const TEST_DURATION_SECONDS = 15 * 60;
const MINI_TEST_QUESTION_COUNT = 10;

export function MiniTest({ questions }: MiniTestProps) {
  const testQuestions = useMemo(
    () => questions.slice(0, MINI_TEST_QUESTION_COUNT),
    [questions]
  );
  const [hasStarted, setHasStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(TEST_DURATION_SECONDS);
  const hasSavedResult = useRef(false);

  const currentQuestion = testQuestions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] ?? null : null;

  useEffect(() => {
    if (!hasStarted || isFinished) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => {
        if (seconds <= 1) {
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [hasStarted, isFinished]);

  useEffect(() => {
    if (hasStarted && !isFinished && remainingSeconds === 0) {
      finishTest(true);
    }
  });

  if (testQuestions.length === 0) {
    return (
      <EmptyState
        description="Add questions to the shared question bank before starting a mini test."
        icon={<Clock size={26} />}
        title="No test questions yet"
      />
    );
  }

  function startTest() {
    setHasStarted(true);
    setIsFinished(false);
    setTimeUp(false);
    setCurrentIndex(0);
    setAnswers({});
    setRemainingSeconds(TEST_DURATION_SECONDS);
    hasSavedResult.current = false;
  }

  function handleSelect(choice: string) {
    if (!currentQuestion) {
      return;
    }

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [currentQuestion.id]: choice
    }));
  }

  function handleNext() {
    if (currentIndex === testQuestions.length - 1) {
      finishTest();
      return;
    }

    setCurrentIndex((index) => index + 1);
  }

  function finishTest(expired = false) {
    saveTestResult(expired);
    setTimeUp(expired);
    setIsFinished(true);
  }

  function saveTestResult(expired: boolean) {
    if (hasSavedResult.current || testQuestions.length === 0) {
      return;
    }

    const score = testQuestions.filter(
      (question) => answers[question.id] === question.correctAnswer
    ).length;
    const total = testQuestions.length;
    const percentage = Math.round((score / total) * 100);
    const timeSpent = TEST_DURATION_SECONDS - (expired ? 0 : remainingSeconds);

    saveProgressRecord({
      mode: "test",
      percentage,
      score,
      timeSpent,
      total
    });
    hasSavedResult.current = true;
  }

  if (!hasStarted) {
    return (
      <Card className="mt-10 hover:translate-y-0">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-violet-100 bg-violet-50 text-violet-700">
              <Clock size={22} />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-neutral-950">
              SAT Mini Test
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Take a timed 10-question set from the shared SAT question bank.
              Answers and explanations are shown only after the test ends.
            </p>
          </div>

          <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-neutral-50 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Questions" value={String(testQuestions.length)} />
              <Stat label="Time" value="15 min" />
            </div>
            <Button className="mt-6 w-full" onClick={startTest}>
              Start Mini Test
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (isFinished) {
    return (
      <TestResultsCard
        answers={answers}
        onRestart={startTest}
        questions={testQuestions}
        timeUp={timeUp}
      />
    );
  }

  return (
    <section className="mt-10">
      <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-violet-700">
            Mini Test
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Results and explanations unlock after you finish.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="rounded-md border border-violet-100 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">
            {formatTime(remainingSeconds)}
          </div>
          <Button
            className="w-full sm:w-auto"
            icon={<Flag size={18} />}
            onClick={() => finishTest(false)}
            variant="secondary"
          >
            Finish Test
          </Button>
        </div>
      </div>

      {currentQuestion ? (
        <QuestionCard
          canChangeAnswer
          currentIndex={currentIndex}
          mode="test"
          nextLabel={
            currentIndex === testQuestions.length - 1 ? "Finish Test" : "Next Question"
          }
          onNext={handleNext}
          onSelect={handleSelect}
          question={currentQuestion}
          selectedAnswer={selectedAnswer}
          showFeedback={false}
          totalQuestions={testQuestions.length}
        />
      ) : null}
    </section>
  );
}

type StatProps = {
  label: string;
  value: string;
};

function Stat({ label, value }: StatProps) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold text-neutral-950">{value}</p>
    </div>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}
