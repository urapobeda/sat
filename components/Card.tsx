import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <article
      className={[
        "rounded-lg border border-neutral-200 bg-white/95 p-5 shadow-sm ring-1 ring-white/70 transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-soft sm:p-6",
        className
      ].join(" ")}
    >
      {children}
    </article>
  );
}
