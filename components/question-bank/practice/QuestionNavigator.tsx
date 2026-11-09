"use client";

import { Bookmark, Check, ChevronDown, ListChecks, X } from "lucide-react";
import { memo, useEffect, useId, useRef, useState } from "react";
import type { QuestionFeedback, QuestionSummary } from "@/types/sat";

const tileColors: Record<QuestionSummary["difficulty"], string> = {
  easy: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  hard: "bg-red-100 text-red-800"
};

type QuestionNavigatorProps = {
  currentIndex: number;
  disabled: boolean;
  feedback: Record<string, QuestionFeedback>;
  marked: readonly number[];
  onShowQuestion: (index: number) => void;
  questions: readonly QuestionSummary[];
};

export const QuestionNavigator = memo(function QuestionNavigator({
  currentIndex, disabled, feedback, marked, onShowQuestion, questions
}: QuestionNavigatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [groupAnswered, setGroupAnswered] = useState(false);
  const id = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const currentTile = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (currentTile.current && !currentTile.current.disabled) {
      currentTile.current.scrollIntoView({ block: "nearest" });
      currentTile.current.focus({ preventScroll: true });
    } else {
      closeButton.current?.focus();
    }

    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !wrapper.current?.contains(event.target)) setIsOpen(false);
    }

    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [isOpen]);

  function close() {
    setIsOpen(false);
    trigger.current?.focus();
  }

  const markedIndices = new Set(marked);
  const indices = isOpen ? questions.map((_, index) => index) : [];
  const groups = groupAnswered ? [
    { label: "Answered", indices: indices.filter((index) => feedback[questions[index].id]) },
    { label: "Unanswered", indices: indices.filter((index) => !feedback[questions[index].id]) }
  ] : [{ label: "", indices }];

  return (
    <div className="relative" ref={wrapper} onKeyDown={(event) => {
      if (isOpen && event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    }}>
      <button
        aria-controls={isOpen ? id : undefined}
        aria-expanded={isOpen}
        aria-label={`Question ${currentIndex + 1} of ${questions.length}. Open question navigator`}
        className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-neutral-900 px-3 text-sm font-semibold text-white sm:px-5"
        onClick={() => setIsOpen(!isOpen)}
        ref={trigger}
        type="button"
      >
        {currentIndex + 1} of {questions.length}
        <ChevronDown aria-hidden="true" className={isOpen ? "rotate-180" : undefined} size={14} />
      </button>
      {isOpen ? (
        <section
          aria-labelledby={`${id}-title`}
          className="absolute bottom-full left-0 z-30 mb-3 flex max-h-[min(40rem,calc(100dvh-8rem))] w-[min(28rem,calc(100vw-1.5rem))] flex-col rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-xl sm:p-4"
          id={id}
        >
          <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-200 pb-3">
            <h2 className="mr-auto text-base font-semibold sm:text-lg" id={`${id}-title`}>Question Bank</h2>
            <button
              aria-pressed={groupAnswered}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-slate-200 px-2 text-xs font-medium text-slate-600 hover:bg-slate-50 aria-pressed:bg-slate-100 aria-pressed:text-slate-950 sm:px-3 sm:text-sm"
              onClick={() => setGroupAnswered(!groupAnswered)}
              type="button"
            >
              <ListChecks aria-hidden="true" size={15} /> Group Answered
            </button>
            <button
              aria-label="Close question navigator"
              className="grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
              onClick={close}
              ref={closeButton}
              type="button"
            >
              <X aria-hidden="true" size={17} />
            </button>
          </div>

          <ul aria-label="Question status legend" className="flex shrink-0 flex-wrap gap-x-4 gap-y-1.5 py-3">
            <li className="flex items-center gap-1.5"><Check aria-hidden="true" className="size-5 rounded-full bg-green-700 p-0.5 text-white" /> Correct</li>
            <li className="flex items-center gap-1.5"><X aria-hidden="true" className="size-5 rounded-full bg-red-600 p-0.5 text-white" /> Incorrect</li>
            <li className="flex items-center gap-1.5"><Bookmark aria-hidden="true" className="fill-amber-600 text-amber-600" size={16} /> For Review</li>
          </ul>

          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-1 [scrollbar-gutter:stable]">
            {groups.map((group) => group.indices.length ? (
              <div key={group.label}>
                {group.label ? <p className="mb-2 text-xs font-semibold text-slate-600">{group.label} ({group.indices.length})</p> : null}
                <div className="grid grid-cols-6 gap-x-2 gap-y-4 pt-1 sm:gap-x-4">
                  {group.indices.map((index) => {
                    const question = questions[index];
                    const result = feedback[question.id];
                    const isMarked = markedIndices.has(index);
                    const isCurrent = currentIndex === index;
                    const status = result ? (result.isCorrect ? "Correct" : "Incorrect") : "Unanswered";

                    return (
                      <button
                        aria-current={isCurrent ? "step" : undefined}
                        aria-label={`Question ${index + 1}, ${question.difficulty}, ${status}${isMarked ? ", For Review" : ""}`}
                        className={`relative grid min-h-10 min-w-0 place-items-center rounded-xl text-sm font-semibold tabular-nums hover:brightness-95 disabled:cursor-default disabled:opacity-60 sm:min-h-12 ${tileColors[question.difficulty]} ${isCurrent ? "ring-2 ring-slate-500 ring-offset-2" : ""}`}
                        disabled={disabled}
                        key={question.id}
                        onClick={() => {
                          close();
                          onShowQuestion(index);
                        }}
                        ref={isCurrent ? currentTile : undefined}
                        type="button"
                      >
                        {index + 1}
                        {isMarked ? <Bookmark aria-hidden="true" className="absolute -left-0.5 -top-1.5 size-4 fill-amber-600 text-amber-600" /> : null}
                        {result ? (
                          <span aria-hidden="true" className={`absolute -top-1.5 right-0 flex size-5 items-center justify-center rounded-full text-white ring-2 ring-white ${result.isCorrect ? "bg-green-700" : "bg-red-600"}`}>
                            {result.isCorrect ? <Check size={14} /> : <X size={14} />}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null)}
          </div>
        </section>
      ) : null}
    </div>
  );
});
