import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

type SectionHeroCardProps = {
  answered: number;
  gradient: string;
  href: string;
  icon: LucideIcon;
  title: string;
  total: number;
};

export function SectionHeroCard({
  answered,
  gradient,
  href,
  icon: Icon,
  title,
  total
}: SectionHeroCardProps) {
  const percent = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <article
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-6 text-white shadow-lg sm:p-7`}
    >
      <Icon
        className="pointer-events-none absolute -bottom-8 -right-8 text-white/15"
        size={170}
        strokeWidth={1.25}
      />

      <div className="relative">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="mt-4 flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-white/90">
            {answered.toLocaleString()} of {total.toLocaleString()} solved
          </p>
          <span className="text-sm font-bold">{percent}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${percent}%` }}
          />
        </div>
        <Link
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-white/90"
          href={href}
        >
          Open
          <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
}
