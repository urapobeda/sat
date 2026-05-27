import { ArrowRight } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Layout } from "@/components/Layout";
import { testPlans } from "@/lib/content";

export default function TestsPage() {
  return (
    <Layout>
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-normal text-violet-700">
          Tests
        </p>
        <h1 className="text-3xl font-bold text-neutral-950 sm:text-5xl">
          SAT-style test sessions
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-neutral-600">
          Prepare with diagnostic, timed, and full-length test layouts ready for
          future scoring logic.
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {testPlans.map((test) => {
          const Icon = test.icon;

          return (
            <Card key={test.title}>
              <div className="flex h-12 w-12 items-center justify-center rounded-md border border-violet-100 bg-violet-50 text-violet-700">
                <Icon size={22} />
              </div>
              <h2 className="mt-5 text-xl font-bold text-neutral-950">{test.title}</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {test.description}
              </p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-neutral-900">
                  {test.meta}
                </span>
                <Button icon={<ArrowRight size={18} />} variant="secondary">
                  Start
                </Button>
              </div>
            </Card>
          );
        })}
      </section>
    </Layout>
  );
}
