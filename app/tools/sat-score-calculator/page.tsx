"use client";

import { Calculator, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { ProgressBar } from "@/components/quiz/ProgressBar";

export default function SatScoreCalculatorRoute() {
  const [readingWritingCorrect, setReadingWritingCorrect] = useState(32);
  const [mathCorrect, setMathCorrect] = useState(32);
  const readingWritingScore = estimateSectionScore(readingWritingCorrect, 54);
  const mathScore = estimateSectionScore(mathCorrect, 44);
  const totalScore = readingWritingScore + mathScore;
  const accuracy = useMemo(
    () => Math.round(((readingWritingCorrect + mathCorrect) / 98) * 100),
    [mathCorrect, readingWritingCorrect]
  );

  return (
    <Layout>
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-white p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-blue-600">
              Tools
            </p>
            <h1 className="mt-3 text-4xl font-black text-slate-950">
              SAT Score Calculator
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Estimate a 400-1600 score from correct answers. This is a practice
              estimate, not an official SAT scoring table.
            </p>
          </div>
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Calculator size={38} />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <ScoreSlider
            label="Reading & Writing Correct"
            max={54}
            onChange={setReadingWritingCorrect}
            value={readingWritingCorrect}
          />
          <ScoreSlider
            label="Math Correct"
            max={44}
            onChange={setMathCorrect}
            value={mathCorrect}
          />
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <TrendingUp size={24} />
            </span>
            <div>
              <p className="text-sm font-black text-slate-500">Estimated Score</p>
              <h2 className="text-4xl font-black text-slate-950">{totalScore}</h2>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric label="R&W" value={`${readingWritingScore}`} />
            <Metric label="Math" value={`${mathScore}`} />
            <Metric label="Accuracy" value={`${accuracy}%`} />
            <Metric label="Correct" value={`${readingWritingCorrect + mathCorrect}/98`} />
          </div>
          <ProgressBar className="mt-5" value={accuracy} />
        </aside>
      </section>
    </Layout>
  );
}

function ScoreSlider({
  label,
  max,
  onChange,
  value
}: {
  label: string;
  max: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="block rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-black text-slate-950">{label}</span>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-blue-700 ring-1 ring-blue-100">
          {value} / {max}
        </span>
      </div>
      <input
        className="mt-4 w-full accent-blue-600"
        max={max}
        min={0}
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-100">
      <p className="text-xl font-black text-slate-950">{value}</p>
      <p className="text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function estimateSectionScore(correct: number, total: number) {
  const ratio = total > 0 ? correct / total : 0;

  return Math.round((200 + ratio * 600) / 10) * 10;
}
