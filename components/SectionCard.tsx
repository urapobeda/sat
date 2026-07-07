import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/Card";

type SectionCardProps = {
  cta: string;
  description: string;
  href: string;
  icon: LucideIcon;
  panel: string;
  questions: string;
  title: string;
  tone: string;
  topics: string[];
};

export function SectionCard({
  cta,
  description,
  href,
  icon: Icon,
  panel,
  questions,
  title,
  tone,
  topics
}: SectionCardProps) {
  return (
    <Card className={`group h-full hover:-translate-y-1 hover:shadow-lg ${panel}`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
        <div
          className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-xl transition group-hover:scale-105`}
        >
          <Icon size={38} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-black text-slate-950">{title}</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            {description}
          </p>
          <p className="mt-4 text-sm font-bold text-slate-800">{questions}</p>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Core topics
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {topics.map((area) => (
                <span
                  className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm"
                  key={area}
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
          <Link
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-600 shadow-sm ring-1 ring-blue-100 transition group-hover:gap-3 group-hover:ring-blue-200"
            href={href}
          >
            {cta}
            <ArrowRight size={16} />
          </Link>
        </div>
        <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-md transition group-hover:translate-x-1 sm:flex">
          <ArrowRight size={22} />
        </span>
      </div>
    </Card>
  );
}
