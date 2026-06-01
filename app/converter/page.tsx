import { Calculator } from "lucide-react";
import { Card } from "@/components/Card";
import { Layout } from "@/components/Layout";

export default function ConverterPage() {
  return (
    <Layout>
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-normal text-blue-700">
          Converter
        </p>
        <h1 className="text-3xl font-bold text-slate-950 sm:text-5xl">
          SAT Score Converter
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-600">
          A score conversion tool can live here later. For now, this keeps the
          navigation complete while the MVP focuses on practice, tests, and
          progress tracking.
        </p>
      </section>

      <Card className="mt-10 hover:translate-y-0">
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
            <Calculator size={28} />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-950">
            Converter coming soon
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
            Add raw-to-scaled score conversion, section estimates, and score
            goal planning in a future iteration.
          </p>
        </div>
      </Card>
    </Layout>
  );
}
