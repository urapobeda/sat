import { ChevronDown, type LucideIcon } from "lucide-react";

type FilterCardProps<T extends string> = {
  accent: string;
  icon: LucideIcon;
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
};

export function FilterCard<T extends string>({
  accent,
  icon: Icon,
  label,
  onChange,
  options,
  value
}: FilterCardProps<T>) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <label className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
      <select
        aria-label={label}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-4">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent}`}
        >
          <Icon size={23} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-slate-500">
            {label}
          </span>
          <span className="mt-1 block truncate text-base font-black text-slate-950">
            {selected.label}
          </span>
        </span>
        <ChevronDown
          className="shrink-0 text-slate-900 transition group-hover:text-blue-600"
          size={18}
        />
      </div>
    </label>
  );
}
