import { ChevronDown, type LucideIcon } from "lucide-react";

type FilterCardProps = {
  accent: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

export function FilterCard({ accent, icon: Icon, label, value }: FilterCardProps) {
  return (
    <button
      className="group flex min-h-20 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-lg"
      type="button"
    >
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
          {value}
        </span>
      </span>
      <ChevronDown
        className="shrink-0 text-slate-900 transition group-hover:text-blue-600"
        size={18}
      />
    </button>
  );
}
