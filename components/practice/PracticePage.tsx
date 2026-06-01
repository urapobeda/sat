"use client";

import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Layers3,
  ListChecks,
  Sparkles,
  SquareRadical,
  Trophy
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { FilterCard } from "@/components/practice/FilterCard";
import { ProgressSidebar } from "@/components/practice/ProgressSidebar";
import { QuestionCard } from "@/components/practice/QuestionCard";
import type { Question } from "@/data/questions";

type PracticePageProps = {
  questions: Question[];
};

type SectionValue = "math" | "reading-writing" | "all";
type QuestionTypeValue = "all" | "algebra" | "grammar" | "reading";
type DifficultyValue = "easy" | "medium" | "hard" | "all";
type QuestionCountValue = "5" | "10";

const referenceQuestion: Question = {
  id: "practice-reference-003",
  section: "math",
  difficulty: "medium",
  question: "If 2x - 3 = 7, what is the value of 4x + 1?",
  choices: ["9", "13", "17", "21"],
  correctAnswer: "21",
  explanation:
    "Add 3 to both sides to get 2x = 10, so x = 5. Then 4x + 1 = 21."
};

const sectionOptions: Array<{ label: string; value: SectionValue }> = [
  { label: "Math", value: "math" },
  { label: "Reading & Writing", value: "reading-writing" },
  { label: "All Sections", value: "all" }
];

const typeOptions: Array<{ label: string; value: QuestionTypeValue }> = [
  { label: "All Types", value: "all" },
  { label: "Algebra", value: "algebra" },
  { label: "Grammar", value: "grammar" },
  { label: "Reading", value: "reading" }
];

const difficultyOptions: Array<{ label: string; value: DifficultyValue }> = [
  { label: "Medium", value: "medium" },
  { label: "Easy", value: "easy" },
  { label: "Hard", value: "hard" },
  { label: "All Levels", value: "all" }
];

const countOptions: Array<{ label: string; value: QuestionCountValue }> = [
  { label: "10 Questions", value: "10" },
  { label: "5 Questions", value: "5" }
];

export function PracticePage({ questions }: PracticePageProps) {
  const practiceQuestions = useMemo(() => buildPracticeQuestions(questions), [questions]);
  const [section, setSection] = useState<SectionValue>("math");
  const [questionType, setQuestionType] = useState<QuestionTypeValue>("all");
  const [difficulty, setDifficulty] = useState<DifficultyValue>("medium");
  const [questionCount, setQuestionCount] = useState<QuestionCountValue>("10");
  const [currentIndex, setCurrentIndex] = useState(2);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    createInitialAnswers(practiceQuestions)
  );
  const [remainingSeconds, setRemainingSeconds] = useState(14 * 60 + 25);

  const visibleQuestions = useMemo(
    () => practiceQuestions.slice(0, Number(questionCount)),
    [practiceQuestions, questionCount]
  );
  const safeIndex = Math.min(currentIndex, visibleQuestions.length - 1);
  const currentQuestion = visibleQuestions[safeIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] ?? null : null;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const answeredQuestions = visibleQuestions.filter((question) => answers[question.id]);
  const correctCount = visibleQuestions.filter(
    (question) => answers[question.id] === question.correctAnswer
  ).length;

  function selectAnswer(choice: string) {
    if (!currentQuestion) {
      return;
    }

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [currentQuestion.id]: choice
    }));
  }

  function clearAnswer() {
    if (!currentQuestion) {
      return;
    }

    setAnswers((currentAnswers) => {
      const nextAnswers = { ...currentAnswers };
      delete nextAnswers[currentQuestion.id];
      return nextAnswers;
    });
  }

  function goNext() {
    setCurrentIndex((index) => Math.min(index + 1, visibleQuestions.length - 1));
  }

  function goPrevious() {
    setCurrentIndex((index) => Math.max(index - 1, 0));
  }

  return (
    <Layout>
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-white p-6 shadow-soft sm:p-8">
        <DecorativeClipboard />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              Practice Questions
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              Choose a section, set your preferences, and start practicing with
              SAT-style questions.
            </p>
          </div>

          <div className="hidden h-24 w-24 shrink-0 rotate-6 items-center justify-center rounded-3xl bg-white text-blue-600 shadow-lg shadow-blue-900/10 ring-1 ring-blue-100 lg:flex">
            <ClipboardCheck size={50} />
          </div>
        </div>

        <div className="relative z-10 mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FilterCard
            accent="bg-blue-50 text-blue-600"
            icon={SquareRadical}
            label="Section"
            onChange={setSection}
            options={sectionOptions}
            value={section}
          />
          <FilterCard
            accent="bg-blue-50 text-blue-600"
            icon={ListChecks}
            label="Question Type"
            onChange={setQuestionType}
            options={typeOptions}
            value={questionType}
          />
          <FilterCard
            accent="bg-emerald-50 text-emerald-600"
            icon={BarChart3}
            label="Difficulty"
            onChange={setDifficulty}
            options={difficultyOptions}
            value={difficulty}
          />
          <FilterCard
            accent="bg-violet-50 text-violet-600"
            icon={Layers3}
            label="Question Count"
            onChange={(value) => {
              setQuestionCount(value);
              setCurrentIndex((index) => Math.min(index, Number(value) - 1));
            }}
            options={countOptions}
            value={questionCount}
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {currentQuestion ? (
          <QuestionCard
            currentIndex={safeIndex}
            onClear={clearAnswer}
            onNext={goNext}
            onPrevious={goPrevious}
            onSelect={selectAnswer}
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            timerLabel={formatTime(remainingSeconds)}
            totalQuestions={visibleQuestions.length}
          />
        ) : null}

        <ProgressSidebar
          answeredCount={answeredQuestions.length}
          answeredQuestionIds={answeredQuestions.map((question) => question.id)}
          correctCount={correctCount}
          questions={visibleQuestions}
        />
      </section>

      <section className="mt-8 rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Trophy className="shrink-0 text-blue-600" size={30} />
            <p className="text-lg font-semibold leading-7 text-slate-950">
              Consistent practice leads to excellence. Keep going!
            </p>
          </div>
          <Sparkles className="hidden shrink-0 text-blue-600 sm:block" size={28} />
        </div>
      </section>
    </Layout>
  );
}

function DecorativeClipboard() {
  return (
    <div className="pointer-events-none absolute right-[24%] top-5 hidden lg:block">
      <BookOpen className="absolute -left-10 top-8 text-emerald-400" size={18} />
      <Sparkles className="absolute -right-10 top-2 text-violet-500" size={18} />
      <Sparkles className="absolute -left-4 -top-1 text-blue-500" size={18} />
      <div className="h-28 w-20 rotate-6 rounded-2xl border-4 border-blue-300 bg-white shadow-lg">
        <div className="mx-auto -mt-2 h-5 w-10 rounded-lg bg-blue-300" />
        <div className="mt-5 space-y-3 px-4">
          <div className="h-2 rounded-full bg-slate-200" />
          <div className="h-2 rounded-full bg-slate-200" />
          <div className="h-2 rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

function buildPracticeQuestions(sourceQuestions: Question[]) {
  const firstMath = sourceQuestions.find((question) => question.id === "math-001");
  const secondMath = sourceQuestions.find((question) => question.id === "math-002");
  const ordered = [
    firstMath,
    secondMath,
    referenceQuestion,
    ...sourceQuestions.filter(
      (question) => question.id !== "math-001" && question.id !== "math-002"
    )
  ].filter(Boolean) as Question[];

  return ordered.slice(0, 10);
}

function createInitialAnswers(practiceQuestions: Question[]) {
  const initialAnswers: Record<string, string> = {};

  if (practiceQuestions[0]) {
    initialAnswers[practiceQuestions[0].id] = practiceQuestions[0].correctAnswer;
  }

  if (practiceQuestions[1]) {
    initialAnswers[practiceQuestions[1].id] = practiceQuestions[1].choices[0];
  }

  if (practiceQuestions[2]) {
    initialAnswers[practiceQuestions[2].id] = practiceQuestions[2].choices[1];
  }

  return initialAnswers;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}
