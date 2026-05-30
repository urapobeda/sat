"use client";

import { useMemo, useRef, useState } from "react";
import {
  PracticeSetup,
  type DifficultyFilter,
  type SectionFilter
} from "@/components/PracticeSetup";
import { QuestionCard } from "@/components/QuestionCard";
import { ResultsCard } from "@/components/ResultsCard";
import type { Question } from "@/data/questions";
import { saveProgressRecord } from "@/lib/progress";

type PracticeQuizProps = {
  questions: Question[];
};

export function PracticeQuiz({ questions }: PracticeQuizProps) {
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("all");
  const [hasStarted, setHasStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const hasSavedResult = useRef(false);

  const filteredQuestions = useMemo(
    () =>
      questions.filter((question) => {
        const matchesSection =
          sectionFilter === "all" || question.section === sectionFilter;
        const matchesDifficulty =
          difficultyFilter === "all" || question.difficulty === difficultyFilter;

        return matchesSection && matchesDifficulty;
      }),
    [difficultyFilter, questions, sectionFilter]
  );

  const totalQuestions = filteredQuestions.length;
  const currentQuestion = filteredQuestions[currentIndex];
  const hasAnswered = selectedAnswer !== null;

  function resetPracticeState() {
    setHasStarted(false);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setCorrectCount(0);
    setIsFinished(false);
    hasSavedResult.current = false;
  }

  function handleSectionChange(section: SectionFilter) {
    setSectionFilter(section);
    resetPracticeState();
  }

  function handleDifficultyChange(difficulty: DifficultyFilter) {
    setDifficultyFilter(difficulty);
    resetPracticeState();
  }

  function handleStart() {
    if (totalQuestions === 0) {
      return;
    }

    setHasStarted(true);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setCorrectCount(0);
    setIsFinished(false);
    hasSavedResult.current = false;
  }

  function handleSelect(choice: string) {
    if (hasAnswered || !currentQuestion) {
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

    if (currentIndex === totalQuestions - 1) {
      savePracticeResult();
      setIsFinished(true);
      return;
    }

    setCurrentIndex((index) => index + 1);
    setSelectedAnswer(null);
  }

  function handleRestart() {
    setHasStarted(true);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setCorrectCount(0);
    setIsFinished(false);
    hasSavedResult.current = false;
  }

  function savePracticeResult() {
    if (hasSavedResult.current || totalQuestions === 0) {
      return;
    }

    const percentage = Math.round((correctCount / totalQuestions) * 100);

    saveProgressRecord({
      difficulty: difficultyFilter,
      mode: "practice",
      percentage,
      score: correctCount,
      section: sectionFilter,
      total: totalQuestions
    });
    hasSavedResult.current = true;
  }

  return (
    <>
      <PracticeSetup
        difficulty={difficultyFilter}
        matchingCount={totalQuestions}
        onDifficultyChange={handleDifficultyChange}
        onSectionChange={handleSectionChange}
        onStart={handleStart}
        section={sectionFilter}
      />

      {hasStarted && isFinished ? (
        <ResultsCard
          correctCount={correctCount}
          onRestart={handleRestart}
          totalQuestions={totalQuestions}
        />
      ) : null}

      {hasStarted && !isFinished && currentQuestion ? (
        <QuestionCard
          currentIndex={currentIndex}
          onNext={handleNextQuestion}
          onSelect={handleSelect}
          question={currentQuestion}
          selectedAnswer={selectedAnswer}
          totalQuestions={totalQuestions}
        />
      ) : null}
    </>
  );
}
