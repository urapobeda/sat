import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import type { Question } from "@/data/questions";

type TestResultsCardProps = {
  answers: Record<string, string>;
  onRestart: () => void;
  questions: Question[];
  timeUp: boolean;
};

const sectionLabels = {
  math: "Math",
  "reading-writing": "Reading and Writing"
};

export function TestResultsCard({
  answers,
  onRestart,
  questions,
  timeUp
}: TestResultsCardProps) {
  const totalQuestions = questions.length;
  const correctCount = questions.filter(
    (question) => answers[question.id] === question.correctAnswer
  ).length;
  const percentage =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <section className="mt-10 space-y-6">
      {timeUp ? (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          <AlertTriangle size={20} />
          <span>Time is up</span>
        </div>
      ) : null}

      <Card className="hover:translate-y-0">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-md border border-violet-100 bg-violet-50 text-violet-700">
              <CheckCircle2 size={28} />
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-normal text-neutral-500">
              Mini test complete
            </p>
            <h2 className="mt-2 text-3xl font-bold text-neutral-950">
              {correctCount} of {totalQuestions} correct
            </h2>
            <p className="mt-3 text-lg font-semibold text-violet-700">
              Score: {percentage}%
            </p>
          </div>
          <Button icon={<RotateCcw size={18} />} onClick={onRestart}>
            Start Mini Test
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        {questions.map((question, index) => {
          const selectedAnswer = answers[question.id];
          const isCorrect = selectedAnswer === question.correctAnswer;

          return (
            <Card className="hover:translate-y-0" key={question.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-neutral-950 px-2.5 py-1 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                    {sectionLabels[question.section]}
                  </span>
                  <span
                    className={[
                      "rounded-md border px-2.5 py-1 text-xs font-semibold",
                      isCorrect
                        ? "border-teal-100 bg-teal-50 text-teal-700"
                        : "border-rose-100 bg-rose-50 text-rose-700"
                    ].join(" ")}
                  >
                    {isCorrect ? "Correct" : "Review"}
                  </span>
                </div>
                <span className="text-xs font-medium text-neutral-400">
                  {question.id}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-bold leading-7 text-neutral-950">
                {question.question}
              </h3>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <AnswerLine label="Your answer" value={selectedAnswer ?? "No answer"} />
                <AnswerLine label="Correct answer" value={question.correctAnswer} />
              </div>

              <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">
                <span className="font-semibold text-neutral-950">Explanation: </span>
                {question.explanation}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

type AnswerLineProps = {
  label: string;
  value: string;
};

function AnswerLine({ label, value }: AnswerLineProps) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-neutral-950">
        {value}
      </p>
    </div>
  );
}
