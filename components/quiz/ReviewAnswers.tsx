import type { Question } from "@/data/questions";

type ReviewAnswersProps = {
  answers: Record<string, string>;
  questions: Question[];
};

export function ReviewAnswers({ answers, questions }: ReviewAnswersProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-black text-slate-950">Review Answers</h2>
      <div className="mt-5 space-y-4">
        {questions.map((question, index) => {
          const selected = answers[question.id];
          const isCorrect = selected === question.correctAnswer;

          return (
            <div
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
              key={question.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Question {index + 1}
                  </p>
                  <h3 className="mt-2 font-black leading-6 text-slate-950">
                    {question.question}
                  </h3>
                </div>
                <span
                  className={[
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-black",
                    isCorrect
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  ].join(" ")}
                >
                  {isCorrect ? "Correct" : "Review"}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <p className="rounded-xl bg-white p-3 text-slate-600">
                  Selected:{" "}
                  <span className="font-black text-slate-950">
                    {selected ?? "No answer"}
                  </span>
                </p>
                <p className="rounded-xl bg-white p-3 text-slate-600">
                  Correct:{" "}
                  <span className="font-black text-slate-950">
                    {question.correctAnswer}
                  </span>
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {question.explanation}
              </p>
            </div>
          );
        })}
      </div>
    </article>
  );
}
