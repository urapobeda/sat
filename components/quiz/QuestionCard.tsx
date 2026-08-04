"use client";

import { Flag, Send } from "lucide-react";
import { useState } from "react";
import { AnswerOption } from "@/components/quiz/AnswerOption";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import { Timer } from "@/components/quiz/Timer";
import { TopicBadge } from "@/components/quiz/TopicBadge";
import type { Question, QuestionFeedback } from "@/types/sat";

type QuestionCardProps = {
  currentIndex: number;
  mode?: "practice" | "test";
  onSelect: (choice: string) => void;
  question: Question;
  feedback?: QuestionFeedback | null;
  selectedAnswer: string | null;
  showFeedback?: boolean;
  timerSeconds?: number;
  totalQuestions: number;
};

export function QuestionCard({
  currentIndex,
  mode = "practice",
  onSelect,
  question,
  feedback,
  selectedAnswer,
  showFeedback = false,
  timerSeconds,
  totalQuestions
}: QuestionCardProps) {
  const hasAnswered = selectedAnswer !== null;
  const hasChoices = question.choices.length > 0;
  const isCorrect = feedback?.isCorrect ?? false;
  const progress = ((currentIndex + 1) / Math.max(totalQuestions, 1)) * 100;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-base font-black text-slate-600">
            Question {currentIndex + 1} of {totalQuestions}
          </p>
          <ProgressBar className="mt-4" value={progress} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {timerSeconds !== undefined ? <Timer seconds={timerSeconds} /> : null}
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            type="button"
          >
            <Flag size={17} />
            Report
          </button>
        </div>
      </div>

      <div className="mt-7">
        <TopicBadge
          difficulty={question.difficulty}
          section={question.section}
          topic={question.topic}
        />
      </div>

      <h2 className="mt-6 text-xl font-black leading-8 text-slate-950 sm:text-2xl sm:leading-9">
        {question.question}
      </h2>

      {hasChoices ? (
        <div className="mt-7 grid gap-3">
          {question.choices.map((choice, index) => (
            <AnswerOption
              choice={choice}
              correctAnswer={feedback?.correctAnswer}
              index={index}
              isDisabled={mode === "practice" && hasAnswered}
              isSelected={selectedAnswer === choice}
              key={`${question.id}-${choice}`}
              onSelect={onSelect}
              showFeedback={showFeedback}
            />
          ))}
        </div>
      ) : (
        <FreeResponseInput
          hasAnswered={hasAnswered}
          initialAnswer={selectedAnswer ?? ""}
          key={`${question.id}-${selectedAnswer ?? "draft"}`}
          mode={mode}
          onSelect={onSelect}
          questionId={question.id}
        />
      )}

      {showFeedback && hasAnswered && feedback ? (
        <div
          className={[
            "mt-6 rounded-2xl border p-5",
            isCorrect
              ? "border-emerald-100 bg-emerald-50 text-emerald-950"
              : "border-rose-100 bg-rose-50 text-rose-950"
          ].join(" ")}
        >
          <p className="text-sm font-black">
            {isCorrect ? "Correct" : "Incorrect"}
          </p>
          <p className="mt-2 text-sm leading-6">
            Correct answer:{" "}
            <span className="font-black">{feedback.correctAnswer}</span>
          </p>
          <p className="mt-2 text-sm leading-6">{feedback.explanation}</p>
        </div>
      ) : null}
    </article>
  );
}

function FreeResponseInput({
  hasAnswered,
  initialAnswer,
  mode,
  onSelect,
  questionId
}: {
  hasAnswered: boolean;
  initialAnswer: string;
  mode: "practice" | "test";
  onSelect: (choice: string) => void;
  questionId: string;
}) {
  const [draftAnswer, setDraftAnswer] = useState(initialAnswer);
  const isLocked = mode === "practice" && hasAnswered;

  function submitFreeResponse() {
    const trimmedAnswer = draftAnswer.trim();

    if (!trimmedAnswer || isLocked) {
      return;
    }

    onSelect(trimmedAnswer);
  }

  return (
    <div className="mt-7 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <label
        className="text-sm font-black uppercase tracking-[0.12em] text-blue-600"
        htmlFor={`free-response-${questionId}`}
      >
        Student-produced response
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          disabled={isLocked}
          id={`free-response-${questionId}`}
          onChange={(event) => setDraftAnswer(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              submitFreeResponse();
            }
          }}
          placeholder="Type your answer"
          value={draftAnswer}
        />
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          disabled={!draftAnswer.trim() || isLocked}
          onClick={submitFreeResponse}
          type="button"
        >
          Submit
          <Send size={17} />
        </button>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
        Enter an exact numeric or short text answer. In practice mode, the
        answer locks after submission.
      </p>
    </div>
  );
}
