import { ArrowRight, Brain } from "lucide-react";

export function SmartPracticeCard() {
  return (
    <article className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-violet-600 p-5 text-white shadow-lg shadow-violet-700/20">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h2 className="text-2xl font-black">Smart Practice</h2>
          <p className="mt-3 text-sm font-medium leading-6 text-blue-50">
            Focus on your weak areas and improve faster with AI recommendations.
          </p>
        </div>
        <Brain className="shrink-0 text-white/90" size={56} />
      </div>

      <button
        className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-blue-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50"
        type="button"
      >
        Start Smart Practice
        <ArrowRight size={17} />
      </button>
    </article>
  );
}
