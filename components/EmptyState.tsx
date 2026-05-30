import type { ReactNode } from "react";
import { Card } from "@/components/Card";

type EmptyStateProps = {
  description: string;
  icon: ReactNode;
  title: string;
};

export function EmptyState({ description, icon, title }: EmptyStateProps) {
  return (
    <Card className="mt-10 min-h-80 hover:translate-y-0">
      <div className="flex min-h-64 flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-md border border-amber-100 bg-amber-50 text-amber-700">
          {icon}
        </div>
        <h2 className="mt-5 text-xl font-bold text-neutral-950">{title}</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-neutral-600">
          {description}
        </p>
      </div>
    </Card>
  );
}
