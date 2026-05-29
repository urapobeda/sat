import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

type ResultsCardProps = {
  correctCount: number;
  onRestart: () => void;
  totalQuestions: number;
};

export function ResultsCard({
  correctCount,
  onRestart,
  totalQuestions
}: ResultsCardProps) {
  const percentage =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <Card className="mt-8">
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
          Restart this filtered set when you want another clean pass through the
          same questions.
        </p>
        <div className="mt-8 flex justify-center">
          <Button icon={<RotateCcw size={18} />} onClick={onRestart}>
            Restart Practice
          </Button>
        </div>
      </div>
    </Card>
  );
}
