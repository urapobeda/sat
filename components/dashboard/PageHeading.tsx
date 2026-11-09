import type { ReactNode } from "react";

export function PageHeading({ eyebrow, title, description, action }: {
  eyebrow: string; title: string; description: string; action?: ReactNode;
}) {
  return (
    <header className="hub-card flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-7 sm:py-6">
      <div className="min-w-0">
        <p className="hub-eyebrow">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
      </div>
      {action}
    </header>
  );
}
