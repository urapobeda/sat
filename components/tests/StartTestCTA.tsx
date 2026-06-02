import { ArrowRight, Target } from "lucide-react";
import Link from "next/link";

export function StartTestCTA() {
  return (
    <section className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-blue-50 p-6 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
            <Target size={29} />
          </span>
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Ready for your next challenge?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Take a full-length test to measure your progress and identify areas
              to improve.
            </p>
          </div>
        </div>

        <Link
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 sm:w-auto"
          href="/tests/start"
        >
          Start New Test
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
