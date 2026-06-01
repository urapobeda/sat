import type { ReactNode } from "react";

type SidebarCardProps = {
  children: ReactNode;
  className?: string;
};

export function SidebarCard({ children, className = "" }: SidebarCardProps) {
  return (
    <article
      className={[
        "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-blue-100 hover:shadow-lg",
        className
      ].join(" ")}
    >
      {children}
    </article>
  );
}
