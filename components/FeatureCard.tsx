import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/Card";

type FeatureCardProps = {
  cta: string;
  description: string;
  href: string;
  icon: LucideIcon;
  title: string;
  tone: string;
};

export function FeatureCard({
  cta,
  description,
  href,
  icon: Icon,
  title,
  tone
}: FeatureCardProps) {
  return (
    <Card className="group h-full hover:-translate-y-1 hover:shadow-lg">
      <div className="flex h-full flex-col justify-between gap-5">
        <div className="flex items-start gap-5">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-lg transition group-hover:scale-105`}
          >
            <Icon size={26} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>
        </div>

        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 transition group-hover:gap-3"
          href={href}
        >
          {cta}
          <ArrowRight size={16} />
        </Link>
      </div>
    </Card>
  );
}
