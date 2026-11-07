import type { ReactNode } from "react";

export function LockedProCard({
  children,
  legend,
  subtitle,
  title
}: {
  children: ReactNode;
  legend?: ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-bold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      {legend}

      <div className="mt-5">{children}</div>
    </article>
  );
}
