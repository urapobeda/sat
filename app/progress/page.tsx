import { BarChart3 } from "lucide-react";
import { Card } from "@/components/Card";
import { Layout } from "@/components/Layout";
import { progressStats } from "@/lib/content";

export default function ProgressPage() {
  return (
    <Layout>
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-normal text-amber-700">
          Progress
        </p>
        <h1 className="text-3xl font-bold text-neutral-950 sm:text-5xl">
          Track your SAT prep
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-neutral-600">
          This dashboard is ready for accuracy, streaks, test history, and
          section-level analytics.
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {progressStats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm font-semibold text-neutral-500">{stat.label}</p>
            <p className={`mt-4 text-4xl font-bold ${stat.accent}`}>{stat.value}</p>
          </Card>
        ))}
      </section>

      <section className="mt-10">
        <Card className="min-h-80">
          <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-md border border-amber-100 bg-amber-50 text-amber-700">
              <BarChart3 size={26} />
            </div>
            <h2 className="mt-5 text-xl font-bold text-neutral-950">
              Progress overview
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-neutral-600">
              Your SAT activity chart will appear here after practice sessions
              and tests are connected.
            </p>
          </div>
        </Card>
      </section>
    </Layout>
  );
}
