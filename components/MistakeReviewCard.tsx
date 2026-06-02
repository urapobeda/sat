import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/Button";

export function MistakeReviewCard() {
  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-white via-amber-50/60 to-blue-50/50 p-6 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/20">
            <RotateCcw size={25} />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">
              Mistake Review
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-950">
              Turn missed questions into score gains
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review questions you missed and learn from explanations.
            </p>
          </div>
        </div>
        <Button
          className="w-full rounded-xl sm:w-auto"
          href="/question-bank"
          icon={<ArrowRight size={18} />}
          variant="secondary"
        >
          Review Mistakes
        </Button>
      </div>
    </section>
  );
}
