import type { QuestionDifficulty } from "@/types/sat";
import { QUESTION_DIFFICULTIES, toggleQuestionDifficulty } from "@/lib/questionBankFilters";

export function DifficultyTabs({
  multiple = false,
  onChange,
  value
}: {
  multiple?: boolean;
  onChange: (value: QuestionDifficulty[]) => void;
  value: QuestionDifficulty[];
}) {
  const items: Array<{ label: string; value: QuestionDifficulty | "all" }> = [
    { label: "All", value: "all" },
    { label: "Easy", value: "easy" },
    { label: "Medium", value: "medium" },
    { label: "Hard", value: "hard" }
  ];
  const allSelected = value.length === QUESTION_DIFFICULTIES.length;

  if (multiple) {
    return (
      <fieldset className="flex w-full flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm xl:w-auto">
        <legend className="sr-only">Difficulty levels</legend>
        {items.map((item) => (
          <label key={item.value} className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <input
              checked={item.value === "all" ? allSelected : value.includes(item.value)}
              className="h-4 w-4 accent-blue-600"
              onChange={() => onChange(toggleQuestionDifficulty(value, item.value))}
              type="checkbox"
            />
            {item.label}
          </label>
        ))}
      </fieldset>
    );
  }

  return (
    <div aria-label="Difficulty levels" role="group" className="flex w-full flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm xl:w-auto">
      {items.map((item) => {
        const isActive = item.value === "all" ? allSelected : !allSelected && value.includes(item.value);

        return (
          <button
            aria-pressed={isActive}
            className={[
              "inline-flex min-h-9 items-center justify-center rounded-lg px-4 text-xs font-black transition",
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            ].join(" ")}
            key={item.value}
            onClick={() => onChange(item.value === "all" ? [...QUESTION_DIFFICULTIES] : [item.value])}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
