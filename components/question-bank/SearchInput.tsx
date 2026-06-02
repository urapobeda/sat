import { Search } from "lucide-react";

type SearchInputProps = {
  onChange: (value: string) => void;
  value: string;
};

export function SearchInput({ onChange, value }: SearchInputProps) {
  return (
    <label className="relative block">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        size={19}
      />
      <input
        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        onChange={(event) => onChange(event.target.value)}
        onInput={(event) => onChange(event.currentTarget.value)}
        placeholder="Search topics or questions..."
        type="search"
        value={value}
      />
    </label>
  );
}
