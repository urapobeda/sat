import type { ReactNode } from "react";
import { Card } from "@/components/Card";

type StatTone = "teal" | "violet" | "amber" | "neutral";

type StatTileProps = {
  icon?: ReactNode;
  label: string;
  tone?: StatTone;
  value: string;
};

const toneStyles: Record<StatTone, string> = {
  teal: "text-teal-700 bg-teal-50 border-teal-100",
  violet: "text-violet-700 bg-violet-50 border-violet-100",
  amber: "text-amber-700 bg-amber-50 border-amber-100",
  neutral: "text-neutral-900 bg-neutral-50 border-neutral-200"
};

const valueStyles: Record<StatTone, string> = {
  teal: "text-teal-700",
  violet: "text-violet-700",
  amber: "text-amber-700",
  neutral: "text-neutral-950"
};

export function StatTile({ icon, label, tone = "neutral", value }: StatTileProps) {
  return (
    <Card className="hover:translate-y-0">
      {icon ? (
        <div
          className={[
            "flex h-11 w-11 items-center justify-center rounded-md border",
            toneStyles[tone]
          ].join(" ")}
        >
          {icon}
        </div>
      ) : null}
      <p className={icon ? "mt-5 text-sm font-semibold text-neutral-500" : "text-xs font-semibold uppercase tracking-normal text-neutral-500"}>
        {label}
      </p>
      <p className={["mt-2 text-3xl font-bold", valueStyles[tone]].join(" ")}>
        {value}
      </p>
    </Card>
  );
}
