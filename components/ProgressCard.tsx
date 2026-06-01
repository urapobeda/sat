import { BarChart3, Target } from "lucide-react";

export function ProgressCard() {
  return (
    <div className="relative min-h-[430px] lg:min-h-[500px]">
      <div className="absolute left-2 top-20 hidden h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xl shadow-blue-600/25 sm:flex">
        <BarChart3 size={28} />
      </div>
      <div className="absolute right-8 top-24 hidden h-16 w-16 items-center justify-center rounded-xl bg-emerald-400 text-white shadow-xl shadow-emerald-400/25 sm:flex">
        <Target size={30} />
      </div>

      <div className="absolute left-[8%] right-[10%] top-10 rounded-3xl border border-white/80 bg-white/80 p-6 shadow-2xl shadow-blue-950/10 backdrop-blur sm:p-8 lg:left-[14%] lg:right-[16%] lg:top-8 lg:rotate-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-black text-slate-950">Your Progress</p>
            <p className="mt-6 text-sm font-semibold text-slate-600">Score</p>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-5xl font-black text-slate-950">750</span>
              <span className="pb-2 text-sm font-bold text-slate-500">/1600</span>
            </div>
            <p className="mt-2 text-sm font-bold text-emerald-600">
              +120 vs last week
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            This Week
          </span>
        </div>

        <div className="mt-8 h-28 rounded-2xl bg-gradient-to-b from-blue-50 to-white p-4">
          <div className="flex h-full items-end gap-3">
            {[35, 48, 62, 82, 50, 72, 68, 96].map((height, index) => (
              <div className="flex flex-1 items-end" key={height + index}>
                <span
                  className="w-full rounded-t-full bg-blue-600/80"
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <MiniScore label="Math" score="780" tone="bg-blue-600" />
          <MiniScore label="Reading & Writing" score="720" tone="bg-violet-600" />
        </div>
      </div>

      <div className="absolute bottom-0 right-2 w-48 sm:right-10 sm:w-60 lg:right-4">
        <div className="relative mx-auto h-24 w-32 rounded-[50%] bg-gradient-to-br from-violet-500 to-blue-600 shadow-2xl shadow-blue-800/20">
          <div className="absolute -top-8 left-1/2 h-16 w-44 -translate-x-1/2 rotate-3 rounded-xl bg-gradient-to-br from-violet-400 to-blue-600 shadow-xl" />
          <div className="absolute right-1 top-1 h-16 w-1 rounded-full bg-amber-300" />
          <div className="absolute right-0 top-14 h-8 w-3 rounded-full bg-amber-400" />
        </div>
        <div className="mt-1 h-7 rounded-lg bg-blue-200 shadow-lg" />
        <div className="mx-3 h-7 rounded-lg bg-white shadow-lg" />
        <div className="mx-1 h-7 rounded-lg bg-blue-700 shadow-lg" />
      </div>
    </div>
  );
}

type MiniScoreProps = {
  label: string;
  score: string;
  tone: string;
};

function MiniScore({ label, score, tone }: MiniScoreProps) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">
        {score}
        <span className="text-sm font-bold text-slate-500"> /800</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full w-4/5 rounded-full ${tone}`} />
      </div>
    </div>
  );
}
