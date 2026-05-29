import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import type { Question } from "@/data/questions";

type QuestionCardProps = {
  currentIndex: number;
  onNext: () => void;
  onSelect: (choice: string) => void;
  question: Question;
  selectedAnswer: string | null;
  totalQuestions: number;
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

export function QuestionCard({
  currentIndex,
  onNext,
  onSelect,
  question,
  selectedAnswer,
  totalQuestions
}: QuestionCardProps) {
  const hasAnswered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === question.correctAnswer;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  return (
    <Card className="mt-8 hover:translate-y-0">
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
              {sectionLabels[question.section]}
            </span>
            <span
              className={[
                "rounded-md border px-2.5 py-1 text-xs font-semibold capitalize",
                difficultyStyles[question.difficulty]
              ].join(" ")}
            >
              {question.difficulty}
            </span>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-6">
          <h2 className="text-2xl font-bold leading-9 text-neutral-950">
            {question.question}
          </h2>

          <div className="mt-6 grid gap-3">
            {question.choices.map((choice, choiceIndex) => {
              const isSelected = selectedAnswer === choice;
              const isAnswer = question.correctAnswer === choice;
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
                  onClick={() => onSelect(choice)}
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
              <span className="font-semibold">{question.correctAnswer}</span>
            </p>
            <p className="mt-2 text-sm leading-6">{question.explanation}</p>
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
            onClick={onNext}
          >
            {isLastQuestion ? "Show Result" : "Next Question"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
