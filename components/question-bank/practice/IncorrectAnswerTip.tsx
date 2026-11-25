"use client";
import { Lightbulb, X, ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { MathText } from "@/components/quiz/MathText";

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
  return <aside role="dialog" aria-label="Incorrect answer explanation" className="absolute right-0 top-0 z-20 w-full max-w-[27rem] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5">
    <header className="flex items-start justify-between gap-2">
      <h2 className="flex min-h-11 items-center gap-2 text-lg font-semibold text-sky-600"><Lightbulb aria-hidden="true" size={23} className="shrink-0" />{choice && /^[A-D]$/.test(choice) ? `Why ${choice} is incorrect` : 'Try again'}</h2>
      <button ref={close} type="button" aria-label="Close explanation" onClick={onDismiss} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"><X size={22} aria-hidden="true" /></button>
    </header>
    <div className="mt-2 max-h-[min(45dvh,18rem)] overflow-y-auto break-words text-base leading-7 text-slate-800">
      {explanation ? <MathText text={explanation} /> : <p>{choice && /^[A-D]$/.test(choice) ? 'A separate explanation for this choice is not available yet. Compare it with the question and try another answer.' : 'This answer is not correct. Check your reasoning and try again.'}</p>}
    </div>
    <footer className="mt-4 flex flex-wrap items-center justify-between gap-2">
      <button type="button" onClick={onDismiss} className="min-h-11 cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">Try again</button>
      <button type="button" onClick={onNext} className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">{nextLabel}<ChevronRight size={17} aria-hidden="true" /></button>
    </footer>
  </aside>;
}
