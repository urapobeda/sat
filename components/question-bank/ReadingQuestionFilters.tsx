import { BarChart3, ChevronDown, CircleCheck } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { DifficultyTabs } from "@/components/question-bank/DifficultyTabs";
import { QUESTION_DIFFICULTIES, type QuestionCompletion } from "@/lib/questionBankFilters";
import type { QuestionDifficulty } from "@/types/sat";

const COMPLETION_LABELS: Record<QuestionCompletion, string> = {
  all: "All questions",
  completed: "Completed",
  "not-completed": "Not completed"
};

export function ReadingQuestionFilters({
  completion,
  difficulties,
  isProgressReady,
  onCompletionChange,
  onDifficultyChange
}: {
  completion: QuestionCompletion;
  difficulties: QuestionDifficulty[];
  isProgressReady: boolean;
  onCompletionChange: (completion: QuestionCompletion) => void;
  onDifficultyChange: (difficulties: QuestionDifficulty[]) => void;
}) {
  const group = useId();
  const filters = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !filters.current?.contains(event.target)) {
        filters.current?.querySelector("details[open]")?.removeAttribute("open");
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  return (
    <div
      className="relative flex flex-wrap gap-2"
      ref={filters}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        const openFilter = filters.current?.querySelector("details[open]");
        if (!openFilter) return;
        openFilter.removeAttribute("open");
        openFilter.querySelector("summary")?.focus();
      }}
    >
      <FilterDropdown
        group={group}
        icon={<BarChart3 size={17} aria-hidden="true" />}
        label={difficulties.length === QUESTION_DIFFICULTIES.length ? "Difficulty" : `Difficulty (${difficulties.length})`}
        title="Difficulty"
      >
        <DifficultyTabs multiple onChange={onDifficultyChange} value={difficulties} />
      </FilterDropdown>
      <FilterDropdown
        group={group}
        icon={<CircleCheck size={17} aria-hidden="true" />}
        label={completion === "all" ? "Completed" : COMPLETION_LABELS[completion]}
        title="Completion"
      >
        <fieldset className="space-y-1">
          <legend className="sr-only">Question completion</legend>
          {(Object.keys(COMPLETION_LABELS) as QuestionCompletion[]).map((option) => (
            <label
              className="flex min-h-11 cursor-pointer items-center gap-4 rounded-lg px-2 text-sm font-medium text-slate-900 hover:bg-slate-50 has-disabled:cursor-default has-disabled:opacity-50"
              key={option}
            >
              <input
                checked={completion === option}
                className="h-5 w-5 accent-blue-600"
                disabled={!isProgressReady && option !== "all"}
                name={`${group}-completion`}
                onChange={() => onCompletionChange(option)}
                type="radio"
              />
              {COMPLETION_LABELS[option]}
            </label>
          ))}
        </fieldset>
      </FilterDropdown>
    </div>
  );
}

function FilterDropdown({ children, group, icon, label, title }: {
  children: ReactNode;
  group: string;
  icon: ReactNode;
  label: string;
  title: string;
}) {
  return (
    <details className="group sm:relative" name={group}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-xl bg-slate-100 px-3.5 text-sm font-semibold text-slate-950 hover:bg-slate-200 [&::-webkit-details-marker]:hidden">
        <span className="text-slate-500">{icon}</span>
        {label}
        <ChevronDown aria-hidden="true" className="group-open:rotate-180" size={16} />
      </summary>
      <div className="absolute left-0 top-full z-30 mt-1 w-full max-w-[25rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:w-[25rem]">
        <p className="px-2 pb-2 pt-1 text-sm font-semibold text-slate-950">{title}</p>
        {children}
      </div>
    </details>
  );
}
