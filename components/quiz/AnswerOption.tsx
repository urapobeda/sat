import { MathText } from "@/components/quiz/MathText";
import type { QuestionChoice } from "@/types/sat";

type AnswerOptionProps = {
  choice: QuestionChoice;
  examStyle?: boolean;
  correctLabel?: string | null;
  isDisabled?: boolean;
  isEliminated?: boolean;
  isSelected: boolean;
  onSelect: (label: string) => void;
  onToggleEliminate?: (label: string) => void;
  showFeedback?: boolean;
};

export function AnswerOption({
  choice,
  correctLabel,
  examStyle = false,
  isDisabled = false,
  isEliminated = false,
  isSelected,
  onSelect,
  onToggleEliminate,
  showFeedback = false
}: AnswerOptionProps) {
  const isCorrect = showFeedback && correctLabel === choice.label;
  const isIncorrect = showFeedback && isSelected && correctLabel !== choice.label;
  const optionClass = isCorrect
    ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500"
    : isIncorrect
      ? "border-rose-400 bg-rose-50 text-rose-950 ring-1 ring-rose-400"
      : isSelected
        ? "border-blue-600 bg-blue-50 text-slate-950 ring-1 ring-blue-600"
        : examStyle
          ? "border-slate-500 bg-white text-slate-950 hover:bg-slate-50"
          : "border-slate-300 bg-white text-slate-800 hover:border-slate-500";
  const letterClass = isCorrect
    ? "border-emerald-600 bg-emerald-600 text-white"
    : isIncorrect
      ? "border-rose-600 bg-rose-600 text-white"
      : isSelected
        ? "border-blue-600 bg-blue-600 text-white"
        : "border-slate-500 bg-white text-slate-800";

  return (
    <div className="flex items-center gap-3">
      <button
        aria-pressed={isSelected}
        className={[
          "flex min-h-14 w-full min-w-0 items-center gap-4 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-default",
          examStyle ? "font-serif text-[17px]" : "px-4 text-base",
          optionClass,
          isEliminated && !isDisabled ? "opacity-45" : ""
        ].join(" ")}
        disabled={isDisabled}
        onClick={() => onSelect(choice.label)}
        type="button"
      >
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-sans text-sm font-semibold",
            letterClass,
            isEliminated ? "line-through" : ""
          ].join(" ")}
        >
          {choice.label}
        </span>
        <span className={["min-w-0 flex-1 leading-7", isEliminated ? "line-through decoration-slate-500" : ""].join(" ")}>
          {choice.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- graph answer choice from Supabase Storage
            <img alt={`Choice ${choice.label}`} className="block h-auto max-h-64 w-auto max-w-full" src={choice.imageUrl} />
          ) : null}
          {choice.text ? <MathText text={choice.text} /> : null}
        </span>
      </button>

      {onToggleEliminate ? (
        <button
          aria-label={isEliminated ? `Restore choice ${choice.label}` : `Cross out choice ${choice.label}`}
          aria-pressed={isEliminated}
          className={[
            "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
            isEliminated ? "border-slate-800 bg-slate-800 text-white" : examStyle ? "border-slate-500 text-slate-900 hover:bg-slate-100" : "border-slate-400 text-slate-600 hover:border-slate-700"
          ].join(" ")}
          disabled={isDisabled}
          onClick={() => onToggleEliminate(choice.label)}
          title={isEliminated ? "Restore" : "Cross out"}
          type="button"
        >
          {choice.label}
          <span aria-hidden="true" className="absolute left-[-3px] right-[-3px] top-1/2 h-[1.5px] -translate-y-1/2 bg-current" />
        </button>
      ) : null}
    </div>
  );
}
