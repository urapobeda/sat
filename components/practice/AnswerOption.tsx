type AnswerOptionProps = {
  choice: string;
  index: number;
  isSelected: boolean;
  onSelect: (choice: string) => void;
};

export function AnswerOption({
  choice,
  index,
  isSelected,
  onSelect
}: AnswerOptionProps) {
  const letter = String.fromCharCode(65 + index);

  return (
    <button
      className={[
        "group flex min-h-14 w-full items-center gap-4 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
        isSelected
          ? "border-blue-500 bg-blue-50 text-slate-950 shadow-sm ring-2 ring-blue-100"
          : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50/70 hover:shadow-sm"
      ].join(" ")}
      onClick={() => onSelect(choice)}
      type="button"
    >
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ring-1 ring-inset transition",
          isSelected
            ? "bg-blue-600 text-white ring-blue-600"
            : "bg-white text-slate-700 ring-slate-300 group-hover:ring-blue-300"
        ].join(" ")}
      >
        {letter}
      </span>
      <span className="leading-6">{choice}</span>
    </button>
  );
}
