import { Flag } from "lucide-react";
import { AnswerOption } from "@/components/quiz/AnswerOption";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import { Timer } from "@/components/quiz/Timer";
import { TopicBadge } from "@/components/quiz/TopicBadge";
import type { Question } from "@/types/sat";

type QuestionCardProps = {
  currentIndex: number;
  mode?: "practice" | "test";
  onSelect: (choice: string) => void;
  question: Question;
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
  selectedAnswer,
  showFeedback = false,
  timerSeconds,
  totalQuestions
}: QuestionCardProps) {
  const hasAnswered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === question.correctAnswer;
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

      <div className="mt-7 grid gap-3">
        {question.choices.map((choice, index) => (
          <AnswerOption
            choice={choice}
            correctAnswer={question.correctAnswer}
            index={index}
            isDisabled={mode === "practice" && hasAnswered}
            isSelected={selectedAnswer === choice}
            key={`${question.id}-${choice}`}
            onSelect={onSelect}
            showFeedback={showFeedback}
          />
        ))}
      </div>

      {showFeedback && hasAnswered ? (
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
            <span className="font-black">{question.correctAnswer}</span>
          </p>
          <p className="mt-2 text-sm leading-6">{question.explanation}</p>
        </div>
      ) : null}
    </article>
  );
}
