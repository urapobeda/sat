import type { DifficultyFilter } from "@/types/sat";

export function DifficultyTabs({
  onChange,
  value
}: {
  onChange: (value: DifficultyFilter) => void;
  value: DifficultyFilter;
}) {
  const items: Array<{ label: string; value: DifficultyFilter }> = [
    { label: "All", value: "all" },
    { label: "Easy", value: "easy" },
    { label: "Medium", value: "medium" },
    { label: "Hard", value: "hard" }
  ];

  return (
    <div className="flex w-full flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm xl:w-auto">
      {items.map((item) => {
        const isActive = item.value === value;

        return (
          <button
            className={[
              "inline-flex min-h-9 items-center justify-center rounded-lg px-4 text-xs font-black transition",
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            ].join(" ")}
            key={item.value}
            onClick={() => onChange(item.value)}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
