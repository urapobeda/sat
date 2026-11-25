"use client";
import { Lightbulb, X, ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { MathText } from "@/components/quiz/MathText";
import { BearIcon } from "@/components/dashboard/BearIcon";
import { explanationFocusPhrases } from "@/lib/explanationFocus";

export function IncorrectAnswerTip({choice, explanation, onDismiss, onNext, nextLabel = 'Next'}: {
  choice?: string; explanation?: string; onDismiss: () => void; onNext: () => void; nextLabel?: string;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => { close.current?.focus({preventScroll:true}); }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); onDismiss(); } };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onDismiss]);
  return <aside role="dialog" aria-label="Incorrect answer explanation" className="absolute right-0 top-0 z-20 w-full max-w-[31rem] rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_16px_48px_-16px_rgba(15,23,42,0.28),0_4px_12px_rgba(15,23,42,0.06)] sm:p-6">
    <span aria-hidden="true" className="absolute -left-12 top-5 hidden size-11 place-items-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-500 shadow-sm sm:grid"><BearIcon size={30} /></span>
    <header className="flex items-start justify-between gap-2">
      <h2 className="flex min-h-11 items-center gap-2.5 text-[19px] font-semibold tracking-[-0.02em] text-sky-600 sm:text-[22px]"><Lightbulb aria-hidden="true" size={26} className="shrink-0 fill-sky-200 stroke-sky-400" />SAT Hub Explanation</h2>
      <button ref={close} type="button" aria-label="Close explanation" onClick={onDismiss} className="-mr-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600"><X size={23} aria-hidden="true" /></button>
    </header>
    {choice && /^[A-D]$/.test(choice) ? <p className="mt-0.5 text-xs font-medium tracking-wide text-slate-500">Why {choice} is incorrect</p> : null}
    <div className="mt-4 max-h-[min(45dvh,20rem)] overflow-y-auto break-words text-[18px] font-medium leading-[1.65] tracking-[-0.012em] text-slate-900 sm:text-[21px]">
      {explanation ? <MathText focusPhrases={explanationFocusPhrases(explanation)} text={explanation} /> : <p className="text-[16px] leading-7 text-slate-600">{choice && /^[A-D]$/.test(choice) ? 'A separate explanation for this choice is not available yet. Compare it with the question and try another answer.' : 'This answer is not correct. Check your reasoning and try again.'}</p>}
    </div>
    <footer className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={onDismiss} className="min-h-12 cursor-pointer rounded-[1.2rem] bg-slate-100 px-4 py-2.5 text-base font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700">Try again</button>
      <button type="button" onClick={onNext} className="inline-flex min-h-12 cursor-pointer items-center gap-1.5 rounded-[1.2rem] bg-sky-500 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-sky-600">{nextLabel}<ChevronRight size={20} aria-hidden="true" /></button>
    </footer>
  </aside>;
}
