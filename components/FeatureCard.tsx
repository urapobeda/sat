import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/Card";

type FeatureCardProps = {
  description: string;
  icon: LucideIcon;
  title: string;
  tone: string;
};

export function FeatureCard({
  description,
  icon: Icon,
  title,
  tone
}: FeatureCardProps) {
  return (
    <Card className="group hover:-translate-y-1">
      <div className="flex items-center gap-5">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-lg transition group-hover:scale-105`}
        >
          <Icon size={26} />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </Card>
  );
}
