import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <article
      className={[
        "rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm ring-1 ring-white/70 transition-all duration-300 hover:border-blue-100 hover:shadow-soft sm:p-6",
        className
      ].join(" ")}
    >
      {children}
    </article>
  );
}
