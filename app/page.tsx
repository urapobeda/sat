import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Layout } from "@/components/Layout";
import { practiceAreas, testPlans } from "@/lib/content";

export default function HomePage() {
  return (
    <Layout>
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-7">
          <div className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">
            SAT Math, Reading and Writing
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-bold tracking-normal text-neutral-950 sm:text-6xl">
              SAT Practice Hub
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-neutral-600">
              A clean place to solve SAT tasks, prepare by subject, take practice
              tests, and track progress across Math, Reading, and Writing.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href="/practice" icon={<ArrowRight size={18} />}>
              Start Practice
            </Button>
            <Button href="/tests" icon={<CheckCircle2 size={18} />} variant="secondary">
              View Tests
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {practiceAreas.map((area) => {
            const Icon = area.icon;

            return (
              <Card key={area.title}>
                <div className="flex items-start gap-4">
                  <div
                    className={[
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-md border",
                      area.tone
                    ].join(" ")}
                  >
                    <Icon size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-950">{area.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {area.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-neutral-500">
              Practice tests
            </p>
            <h2 className="mt-2 text-2xl font-bold text-neutral-950">
              Choose a session
            </h2>
          </div>
          <Button href="/tests" variant="secondary">
            Tests
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {testPlans.map((test) => {
            const Icon = test.icon;

            return (
              <Card key={test.title}>
                <Icon className="text-neutral-900" size={24} />
                <h3 className="mt-5 text-lg font-bold text-neutral-950">{test.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {test.description}
                </p>
                <p className="mt-5 text-sm font-semibold text-neutral-900">{test.meta}</p>
              </Card>
            );
          })}
        </div>
      </section>
    </Layout>
  );
}
