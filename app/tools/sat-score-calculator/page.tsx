"use client";

import {
  AlertCircle,
  Calculator,
  Copy,
  Info,
  Minus,
  RotateCcw,
  Share2,
  TrendingUp,
  Plus
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import {
  clampCorrectAnswers,
  estimateModule2Route,
  estimateTotalScore,
  type ModuleRoute,
  type SectionEstimateResult
} from "@/lib/sat-score-estimator";

type CalculatorState = {
  mathModule1: number;
  mathModule2: number;
  readingWritingModule1: number;
  readingWritingModule2: number;
};

const DEFAULT_STATE: CalculatorState = {
  mathModule1: 20,
  mathModule2: 19,
  readingWritingModule1: 23,
  readingWritingModule2: 22
};

const MODULE_TOTALS = {
  math: 22,
  readingWriting: 27
} as const;

export default function SatScoreCalculatorRoute() {
  const [state, setState] = useState<CalculatorState>(DEFAULT_STATE);
  const [toast, setToast] = useState("");
  const [hasLoadedUrlState, setHasLoadedUrlState] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);

      setState({
        mathModule1: readCorrectParam(
          params,
          "m1",
          MODULE_TOTALS.math,
          DEFAULT_STATE.mathModule1
        ),
        mathModule2: readCorrectParam(
          params,
          "m2",
          MODULE_TOTALS.math,
          DEFAULT_STATE.mathModule2
        ),
        readingWritingModule1: readCorrectParam(
          params,
          "rw1",
          MODULE_TOTALS.readingWriting,
          DEFAULT_STATE.readingWritingModule1
        ),
        readingWritingModule2: readCorrectParam(
          params,
          "rw2",
          MODULE_TOTALS.readingWriting,
          DEFAULT_STATE.readingWritingModule2
        )
      });
      setHasLoadedUrlState(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const autoReadingWritingRoute = estimateModule2Route({
    module1Correct: state.readingWritingModule1,
    module1Total: MODULE_TOTALS.readingWriting,
    section: "reading-writing"
  });
  const autoMathRoute = estimateModule2Route({
    module1Correct: state.mathModule1,
    module1Total: MODULE_TOTALS.math,
    section: "math"
  });

  const result = useMemo(
    () =>
      estimateTotalScore({
        math: {
          module1Correct: state.mathModule1,
          module1Total: MODULE_TOTALS.math,
          module2Correct: state.mathModule2,
          module2Route: autoMathRoute,
          module2Total: MODULE_TOTALS.math
        },
        mathRouteSource: "auto",
        readingWriting: {
          module1Correct: state.readingWritingModule1,
          module1Total: MODULE_TOTALS.readingWriting,
          module2Correct: state.readingWritingModule2,
          module2Route: autoReadingWritingRoute,
          module2Total: MODULE_TOTALS.readingWriting
        },
        readingWritingRouteSource: "auto"
      }),
    [
      autoMathRoute,
      autoReadingWritingRoute,
      state.mathModule1,
      state.mathModule2,
      state.readingWritingModule1,
      state.readingWritingModule2
    ]
  );

  useEffect(() => {
    if (!hasLoadedUrlState) {
      return;
    }

    const url = buildEstimateUrl(state);
    window.history.replaceState(null, "", url);
  }, [hasLoadedUrlState, state]);

  function updateCorrect(key: keyof CalculatorState, value: number, max: number) {
    setState((current) => ({
      ...current,
      [key]: clampCorrectAnswers(value, max)
    }));
  }

  function resetCalculator() {
    setState(DEFAULT_STATE);
    showToast("Calculator reset");
  }

  async function copyResult() {
    await navigator.clipboard.writeText(formatResultText(result));
    showToast("Estimate copied");
  }

  async function shareEstimate() {
    const url = `${window.location.origin}${buildEstimateUrl(state)}`;
    const shareData = {
      text: formatResultText(result),
      title: "SAT Score Estimate",
      url
    };

    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await navigator.clipboard.writeText(url);
    showToast("Share link copied");
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  return (
    <Layout>
      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-white p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-blue-600">
              Tools
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              SAT Score Estimator
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Estimate a Digital SAT score from separate Reading & Writing and
              Math modules, including an approximate adaptive Module 2 route.
            </p>
          </div>
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Calculator size={38} />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-6">
          <SectionInputPanel
            accent="blue"
            autoRoute={autoReadingWritingRoute}
            module1Key="readingWritingModule1"
            module1Value={state.readingWritingModule1}
            module2Key="readingWritingModule2"
            module2Value={state.readingWritingModule2}
            onCorrectChange={updateCorrect}
            title="Reading & Writing"
            total={MODULE_TOTALS.readingWriting}
          />
          <SectionInputPanel
            accent="emerald"
            autoRoute={autoMathRoute}
            module1Key="mathModule1"
            module1Value={state.mathModule1}
            module2Key="mathModule2"
            module2Value={state.mathModule2}
            onCorrectChange={updateCorrect}
            title="Math"
            total={MODULE_TOTALS.math}
          />
        </div>

        <ResultsPanel
          onCopy={copyResult}
          onReset={resetCalculator}
          onShare={shareEstimate}
          result={result}
        />
      </section>

      <section className="mt-6 rounded-3xl border border-amber-100 bg-amber-50/80 p-5 shadow-sm">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={22} />
          <p className="text-sm leading-6 text-amber-900">
            This calculator provides an unofficial estimate. Digital SAT scoring
            uses adaptive testing and item-level statistical methods, so the same
            number of correct answers may produce different scores. Only College
            Board can provide an official SAT score.
          </p>
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-black text-emerald-700 shadow-2xl shadow-slate-950/10">
          {toast}
        </div>
      ) : null}
    </Layout>
  );
}

function SectionInputPanel({
  accent,
  autoRoute,
  module1Key,
  module1Value,
  module2Key,
  module2Value,
  onCorrectChange,
  title,
  total
}: {
  accent: "blue" | "emerald";
  autoRoute: ModuleRoute;
  module1Key: keyof CalculatorState;
  module1Value: number;
  module2Key: keyof CalculatorState;
  module2Value: number;
  onCorrectChange: (key: keyof CalculatorState, value: number, max: number) => void;
  title: string;
  total: number;
}) {
  const accentClasses =
    accent === "blue"
      ? "from-blue-600 to-violet-600 text-blue-700 bg-blue-50"
      : "from-emerald-500 to-teal-600 text-emerald-700 bg-emerald-50";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Digital SAT Section
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.1em] ${accentClasses
            .split(" ")
            .slice(2)
            .join(" ")}`}
        >
          {total * 2} questions
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ModuleInputCard
          label={`${title} Module 1`}
          max={total}
          onChange={(value) => onCorrectChange(module1Key, value, total)}
          value={module1Value}
        />
        <ModuleInputCard
          label={`${title} Module 2`}
          max={total}
          onChange={(value) => onCorrectChange(module2Key, value, total)}
          value={module2Value}
        />
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">
              Estimated Module 2 Route
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              The route updates automatically from Module 1 performance.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <span
              className={`rounded-full bg-gradient-to-r px-4 py-2 text-sm font-black capitalize text-white ${accentClasses
                .split(" ")
                .slice(0, 2)
                .join(" ")}`}
            >
              {autoRoute}
            </span>
            <div className="group relative inline-flex items-center gap-1 text-xs font-bold text-slate-500">
              <Info size={15} />
              <span>Auto routing</span>
              <span className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-72 rounded-2xl border border-slate-200 bg-white p-3 text-left text-xs leading-5 text-slate-600 shadow-xl group-hover:block">
                Module routing is estimated. The actual Digital SAT uses a
                proprietary adaptive scoring model.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-xs leading-5 text-slate-500 ring-1 ring-slate-100">
          Based on Module 1, this section is currently routed to{" "}
          <span className="font-black capitalize text-blue-700">{autoRoute}</span>.
        </div>
      </div>
    </article>
  );
}

function ModuleInputCard({
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
  const incorrect = max - value;
  const accuracy = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="font-black text-slate-950" htmlFor={label}>
            {label}
          </label>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {value} correct / {max} total - {incorrect} incorrect
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-blue-700 ring-1 ring-blue-100">
          {accuracy}%
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          aria-label={`Decrease ${label}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          onClick={() => onChange(value - 1)}
          type="button"
        >
          <Minus size={18} />
        </button>
        <input
          aria-describedby={`${label}-summary`}
          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-lg font-black text-slate-950 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          id={label}
          inputMode="numeric"
          max={max}
          min={0}
          onChange={(event) => onChange(Number(event.target.value))}
          step={1}
          type="number"
          value={value}
        />
        <button
          aria-label={`Increase ${label}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          onClick={() => onChange(value + 1)}
          type="button"
        >
          <Plus size={18} />
        </button>
      </div>

      <input
        aria-label={`${label} correct answers slider`}
        className="mt-4 w-full accent-blue-600"
        max={max}
        min={0}
        onChange={(event) => onChange(Number(event.target.value))}
        step={1}
        type="range"
        value={value}
      />
      <p className="sr-only" id={`${label}-summary`}>
        {value} correct answers, {incorrect} incorrect answers, {accuracy} percent
        accuracy.
      </p>
    </div>
  );
}

function ResultsPanel({
  onCopy,
  onReset,
  onShare,
  result
}: {
  onCopy: () => void;
  onReset: () => void;
  onShare: () => void;
  result: ReturnType<typeof estimateTotalScore>;
}) {
  return (
    <aside className="space-y-5">
      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <TrendingUp size={24} />
          </span>
          <div>
            <p className="text-sm font-black text-slate-500">
              Estimated SAT Score
            </p>
            <h2 className="text-5xl font-black tracking-normal text-slate-950">
              {result.totalEstimatedScore}
            </h2>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-blue-50 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">
            Estimated Range
          </p>
          <p className="mt-1 text-2xl font-black text-slate-950">
            {result.totalLowerBound}-{result.totalUpperBound}
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          <SectionResultCard
            module1Total={MODULE_TOTALS.readingWriting}
            module2Total={MODULE_TOTALS.readingWriting}
            title="Reading & Writing"
            value={result.readingWriting}
          />
          <SectionResultCard
            module1Total={MODULE_TOTALS.math}
            module2Total={MODULE_TOTALS.math}
            title="Math"
            value={result.math}
          />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
          <ActionButton icon={<RotateCcw size={17} />} label="Reset" onClick={onReset} />
          <ActionButton icon={<Copy size={17} />} label="Copy Result" onClick={onCopy} />
          <ActionButton icon={<Share2 size={17} />} label="Share" onClick={onShare} />
        </div>
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex gap-3">
          <Info className="mt-0.5 shrink-0 text-blue-600" size={20} />
          <p className="text-sm leading-6 text-slate-600">
            Some Digital SAT questions may be pretest questions and may not
            count toward the official score. A generic calculator cannot
            identify those questions.
          </p>
        </div>
      </article>
    </aside>
  );
}

function SectionResultCard({
  module1Total,
  module2Total,
  title,
  value
}: {
  module1Total: number;
  module2Total: number;
  title: string;
  value: SectionEstimateResult;
}) {
  const progress = Math.round(((value.estimatedScore - 200) / 600) * 100);
  const module1Correct = Math.round(value.module1Accuracy * module1Total);
  const module2Correct = Math.round(value.module2Accuracy * module2Total);

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">
            Estimated:{" "}
            <span className="font-black text-slate-950">
              {value.estimatedScore}
            </span>
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black capitalize text-blue-700 ring-1 ring-blue-100">
          {value.route}
        </span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-600"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <Breakdown label="Range" value={`${value.lowerBound}-${value.upperBound}`} />
        <Breakdown label="Accuracy" value={`${Math.round(value.accuracy * 100)}%`} />
        <Breakdown label="Module 1" value={`${module1Correct} / ${module1Total}`} />
        <Breakdown label="Module 2" value={`${module2Correct} / ${module2Total}`} />
        <Breakdown label="Correct" value={`${value.rawCorrect} / ${value.rawTotal}`} />
        <Breakdown label="Incorrect" value={`${value.rawTotal - value.rawCorrect}`} />
        <Breakdown label="Route Source" value={value.routeSource} />
        <Breakdown label="Confidence" value={value.confidence} />
      </div>
    </div>
  );
}

function Breakdown({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-black capitalize text-slate-950">{value}</p>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-3 text-sm font-black text-blue-700 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function readCorrectParam(
  params: URLSearchParams,
  key: string,
  max: number,
  fallback: number
) {
  const value = params.get(key);

  if (!value) {
    return fallback;
  }

  return clampCorrectAnswers(Number(value), max);
}

function buildEstimateUrl(state: CalculatorState) {
  const params = new URLSearchParams({
    m1: String(state.mathModule1),
    m2: String(state.mathModule2),
    rw1: String(state.readingWritingModule1),
    rw2: String(state.readingWritingModule2),
    s: "calculator"
  });

  return `/tools/sat-score-calculator?${params.toString()}`;
}

function formatResultText(result: ReturnType<typeof estimateTotalScore>) {
  return [
    `Estimated SAT Score: ${result.totalEstimatedScore}`,
    `Estimated Range: ${result.totalLowerBound}-${result.totalUpperBound}`,
    `Reading & Writing: ${result.readingWriting.estimatedScore} (${result.readingWriting.lowerBound}-${result.readingWriting.upperBound})`,
    `Math: ${result.math.estimatedScore} (${result.math.lowerBound}-${result.math.upperBound})`
  ].join("\n");
}
