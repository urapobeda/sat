import { Layout } from "@/components/Layout";
import { ProgressDashboard } from "@/components/ProgressDashboard";

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
          Review your practice and mini test history, track your average score,
          and clear saved progress when you want a fresh start.
        </p>
      </section>

      <ProgressDashboard />
    </Layout>
  );
}
