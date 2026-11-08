import { MathText } from "@/components/quiz/MathText";
import type { ReviewQuestion } from "@/types/sat";

type ReviewAnswersProps = {
  answers: Record<string, string>;
  questions: ReviewQuestion[];
};

export function ReviewAnswers({ answers, questions }: ReviewAnswersProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold text-slate-950">Review Answers</h2>
      <div className="mt-5 space-y-4">
        {questions.map((question, index) => {
          const selected = answers[question.id];
          const isCorrect = question.isCorrect ?? selected === question.correctAnswer;
          const selectedChoice = question.choices.find((choice) => choice.label === selected);
          const correctChoice = question.choices.find((choice) => choice.label === question.correctLabel);

          return (
            <div className="rounded-xl border border-slate-200 p-4" key={question.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Question {index + 1}
                  </p>
                  <MathText
                    className="mt-2 leading-7 text-slate-950"
                    imageAlt={`Question ${index + 1} figure`}
                    images={question.imageUrls}
                    text={question.question}
                  />
                </div>
                <span
                  className={[
                    "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                    isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  ].join(" ")}
                >
                  {isCorrect ? "Correct" : "Review"}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3 text-slate-600">
                  Selected: <span className="font-semibold text-slate-950">{selected ?? "No answer"}</span>
                  {selectedChoice?.text ? <MathText className="mt-1 text-slate-900" text={selectedChoice.text} /> : null}
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-slate-600">
                  Correct: <span className="font-semibold text-slate-950">{question.correctAnswer}</span>
                  {correctChoice?.text ? <MathText className="mt-1 text-slate-900" text={correctChoice.text} /> : null}
                </div>
              </div>
              <MathText className="mt-3 text-sm leading-6 text-slate-700" text={question.explanation} />
            </div>
          );
        })}
      </div>
    </article>
  );
}
