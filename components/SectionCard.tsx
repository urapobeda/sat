import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/Card";

type SectionCardProps = {
  description: string;
  icon: LucideIcon;
  panel: string;
  questions: string;
  title: string;
  tone: string;
};

export function SectionCard({
  description,
  icon: Icon,
  panel,
  questions,
  title,
  tone
}: SectionCardProps) {
  return (
    <Card className={`group hover:-translate-y-1 ${panel}`}>
      <div className="flex items-center gap-5 sm:gap-7">
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
        </div>
        <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-md transition group-hover:translate-x-1 sm:flex">
          <ArrowRight size={22} />
        </span>
      </div>
    </Card>
  );
}
