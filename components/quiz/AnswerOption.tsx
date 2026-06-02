type AnswerOptionProps = {
  choice: string;
  correctAnswer?: string;
  index: number;
  isDisabled?: boolean;
  isSelected: boolean;
  onSelect: (choice: string) => void;
  showFeedback?: boolean;
};

export function AnswerOption({
  choice,
  correctAnswer,
  index,
  isDisabled = false,
  isSelected,
  onSelect,
  showFeedback = false
}: AnswerOptionProps) {
  const letter = String.fromCharCode(65 + index);
  const isCorrect = showFeedback && choice === correctAnswer;
  const isIncorrect = showFeedback && isSelected && choice !== correctAnswer;
  const optionClass = isCorrect
    ? "border-emerald-400 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-100"
    : isIncorrect
      ? "border-rose-300 bg-rose-50 text-rose-950 ring-2 ring-rose-100"
      : isSelected
        ? "border-blue-500 bg-blue-50 text-slate-950 ring-2 ring-blue-100"
        : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50/70 hover:shadow-sm";
  const letterClass = isCorrect
    ? "bg-emerald-600 text-white ring-emerald-600"
    : isIncorrect
      ? "bg-rose-600 text-white ring-rose-600"
      : isSelected
        ? "bg-blue-600 text-white ring-blue-600"
        : "bg-white text-slate-700 ring-slate-300 group-hover:ring-blue-300";

  return (
    <button
      className={[
        "group flex min-h-14 w-full items-center gap-4 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-default disabled:hover:translate-y-0",
        optionClass
      ].join(" ")}
      disabled={isDisabled}
      onClick={() => onSelect(choice)}
      type="button"
    >
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ring-1 ring-inset transition",
          letterClass
        ].join(" ")}
      >
        {letter}
      </span>
      <span className="leading-6">{choice}</span>
    </button>
  );
}
