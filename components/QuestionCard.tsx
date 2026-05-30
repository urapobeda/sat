import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { QuestionMeta } from "@/components/QuestionMeta";
import type { Question } from "@/data/questions";

type QuestionCardProps = {
  canChangeAnswer?: boolean;
  currentIndex: number;
  footer?: ReactNode;
  mode?: "practice" | "test";
  nextLabel?: string;
  onNext: () => void;
  onSelect: (choice: string) => void;
  question: Question;
  showFeedback?: boolean;
  selectedAnswer: string | null;
  totalQuestions: number;
};

export function QuestionCard({
  canChangeAnswer = false,
  currentIndex,
  footer,
  mode = "practice",
  nextLabel,
  onNext,
  onSelect,
  question,
  showFeedback = mode === "practice",
  selectedAnswer,
  totalQuestions
}: QuestionCardProps) {
  const hasAnswered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === question.correctAnswer;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const shouldLockChoices = hasAnswered && !canChangeAnswer;
  const progressColor = mode === "test" ? "bg-violet-600" : "bg-teal-600";
  const instruction =
    mode === "test"
      ? "Choose an answer, then continue. Results and explanations appear after the test."
      : "Choose one answer. After you select it, the explanation will appear and the answer will be locked.";

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
                className={["h-full rounded-full transition-all", progressColor].join(
                  " "
                )}
                style={{
                  width: `${((currentIndex + 1) / totalQuestions) * 100}%`
                }}
              />
            </div>
          </div>

          <QuestionMeta difficulty={question.difficulty} section={question.section} />
        </div>

        <div className="border-t border-neutral-200 pt-6">
          <h2 className="text-xl font-bold leading-8 text-neutral-950 sm:text-2xl sm:leading-9">
            {question.question}
          </h2>

          <div className="mt-6 grid gap-3">
            {question.choices.map((choice, choiceIndex) => {
              const isSelected = selectedAnswer === choice;
              const isAnswer = question.correctAnswer === choice;
              const optionState =
                showFeedback && hasAnswered && isAnswer
                  ? "border-teal-400 bg-teal-50 text-teal-950 ring-1 ring-teal-300"
                  : showFeedback && hasAnswered && isSelected
                    ? "border-rose-300 bg-rose-50 text-rose-950 ring-1 ring-rose-200"
                    : isSelected
                      ? "border-violet-400 bg-violet-50 text-violet-950 ring-1 ring-violet-200"
                    : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50";

              return (
                <button
                  className={[
                    "flex min-h-14 w-full items-start gap-3 rounded-md border px-4 py-3 text-left text-sm font-medium transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 disabled:cursor-default disabled:hover:translate-y-0",
                    optionState
                  ].join(" ")}
                  disabled={shouldLockChoices}
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

        {showFeedback && hasAnswered ? (
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
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-600 sm:p-5">
            {instruction}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {footer}
          <Button
            disabled={!hasAnswered}
            icon={<ArrowRight size={18} />}
            onClick={onNext}
          >
            {nextLabel ?? (isLastQuestion ? "Show Result" : "Next Question")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
