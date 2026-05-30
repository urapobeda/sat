import type { ReactNode } from "react";

type BadgeTone = "neutral" | "dark" | "teal" | "violet" | "amber" | "rose";

type BadgeProps = {
  children: ReactNode;
  className?: string;
  tone?: BadgeTone;
};

const toneStyles: Record<BadgeTone, string> = {
  neutral: "border-neutral-200 bg-neutral-50 text-neutral-700",
  dark: "border-neutral-950 bg-neutral-950 text-white",
  teal: "border-teal-100 bg-teal-50 text-teal-700",
  violet: "border-violet-100 bg-violet-50 text-violet-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  rose: "border-rose-100 bg-rose-50 text-rose-700"
};

export function Badge({ children, className = "", tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex min-h-7 items-center rounded-md border px-2.5 py-1 text-xs font-semibold leading-none",
        toneStyles[tone],
        className
      ].join(" ")}
    >
      {children}
    </span>
  );
}
