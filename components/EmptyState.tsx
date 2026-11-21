import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/Card";

type EmptyStateProps = {
  action?: { href: string; label: string };
  /** Use "h1" when the empty state is the only content on the page. */
  headingLevel?: "h1" | "h2";
  description: string;
  icon: ReactNode;
  title: string;
};

export function EmptyState({ action, description, headingLevel = "h2", icon, title }: EmptyStateProps) {
  const Heading = headingLevel;
  return (
    <Card className="mt-10 min-h-80 hover:translate-y-0">
      <div className="flex min-h-64 flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-md border border-amber-100 bg-amber-50 text-amber-700">
          {icon}
        </div>
        <Heading className="mt-5 text-xl font-bold text-neutral-950">{title}</Heading>
        <p className="mt-3 max-w-md text-sm leading-6 text-neutral-600">
          {description}
        </p>
        {action ? (
          <Link className="hub-primary mt-5 inline-flex" href={action.href}>
            {action.label}
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
