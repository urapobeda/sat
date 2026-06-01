import { BarChart3, Flame, Target, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

export function ProgressCard() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div className="absolute -left-3 top-14 hidden h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/25 sm:flex">
        <BarChart3 size={28} />
      </div>
      <div className="absolute -right-2 top-20 hidden h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-white shadow-xl shadow-emerald-400/25 sm:flex">
        <Target size={30} />
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-5 shadow-2xl shadow-blue-950/10 backdrop-blur sm:p-6 lg:rotate-1">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-violet-500 to-emerald-400" />
        <div className="flex items-start justify-between gap-4">
          <p className="text-lg font-black text-slate-950">Your Progress</p>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            This Week
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[0.78fr_1.22fr]">
          <div className="rounded-2xl bg-slate-50/90 p-4">
            <p className="text-sm font-semibold text-slate-600">Score</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-4xl font-black text-slate-950">750</span>
              <span className="pb-1.5 text-sm font-bold text-slate-500">
                / 1600
              </span>
            </div>
            <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-emerald-600">
              <TrendingUp size={16} />
              +120 vs last week
            </p>
          </div>

          <div className="h-28 rounded-2xl bg-gradient-to-b from-blue-50 to-white p-3">
            <svg
              aria-label="Weekly SAT score trend"
              className="h-full w-full"
              role="img"
              viewBox="0 0 320 118"
            >
              <defs>
                <linearGradient id="scoreFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M20 92 C50 82 60 72 88 68 C118 64 122 42 150 42 C178 42 178 76 206 70 C234 64 236 34 264 35 C292 36 292 18 306 16 L306 108 L20 108 Z"
                fill="url(#scoreFill)"
              />
              <path
                d="M20 92 C50 82 60 72 88 68 C118 64 122 42 150 42 C178 42 178 76 206 70 C234 64 236 34 264 35 C292 36 292 18 306 16"
                fill="none"
                stroke="#2563eb"
                strokeLinecap="round"
                strokeWidth="5"
              />
              {[20, 88, 150, 206, 264, 306].map((x, index) => {
                const y = [92, 68, 42, 70, 35, 16][index];

                return (
                  <circle
                    cx={x}
                    cy={y}
                    fill="#2563eb"
                    key={x}
                    r="5"
                    stroke="white"
                    strokeWidth="3"
                  />
                );
              })}
            </svg>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <MiniScore label="Math" max="800" score="780" tone="bg-blue-600" />
          <MiniScore
            label="Reading & Writing"
            max="800"
            score="720"
            tone="bg-violet-600"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetricTile icon={<Target size={18} />} label="Accuracy" value="84%" />
          <MetricTile icon={<Flame size={18} />} label="Streak" value="7 days" />
        </div>
      </div>

      <div className="pointer-events-none absolute -bottom-8 right-3 hidden w-36 opacity-90 lg:block">
        <div className="relative mx-auto h-16 w-24 rounded-[50%] bg-gradient-to-br from-violet-500 to-blue-600 shadow-2xl shadow-blue-800/20">
          <div className="absolute -top-6 left-1/2 h-11 w-32 -translate-x-1/2 rotate-3 rounded-xl bg-gradient-to-br from-violet-400 to-blue-600 shadow-xl" />
          <div className="absolute right-1 top-0 h-12 w-1 rounded-full bg-amber-300" />
          <div className="absolute right-0 top-10 h-6 w-2 rounded-full bg-amber-400" />
        </div>
        <div className="mt-1 h-5 rounded-lg bg-blue-200 shadow-lg" />
        <div className="mx-3 h-5 rounded-lg bg-white shadow-lg" />
        <div className="mx-1 h-5 rounded-lg bg-blue-700 shadow-lg" />
      </div>
    </div>
  );
}

type MiniScoreProps = {
  label: string;
  max: string;
  score: string;
  tone: string;
};

function MiniScore({ label, max, score, tone }: MiniScoreProps) {
  const progress = `${Math.round((Number(score) / Number(max)) * 100)}%`;

  return (
    <div>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">
        {score}
        <span className="text-sm font-bold text-slate-500"> / {max}</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: progress }} />
      </div>
    </div>
  );
}

type MetricTileProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function MetricTile({ icon, label, value }: MetricTileProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-3">
      <div className="flex items-center gap-2 text-blue-600">{icon}</div>
      <p className="mt-2 text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
