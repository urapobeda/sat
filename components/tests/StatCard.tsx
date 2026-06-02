import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  description: string;
  icon: LucideIcon;
  title: string;
  tone: string;
  value: string;
};

export function StatCard({
  description,
  icon: Icon,
  title,
  tone,
  value
}: StatCardProps) {
  return (
    <article className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
      <div className="flex items-center gap-5">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone}`}
        >
          <Icon size={28} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-2 text-sm leading-5 text-slate-600">{description}</p>
        </div>
      </div>
    </article>
  );
}
