import { ArrowRight } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Layout } from "@/components/Layout";
import { practiceAreas } from "@/lib/content";

export default function PracticePage() {
  return (
    <Layout>
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">
          Practice
        </p>
        <h1 className="text-3xl font-bold text-neutral-950 sm:text-5xl">
          Build skills by section
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-neutral-600">
          Pick a SAT area and move through focused sets for Math, Reading, and
          Writing.
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {practiceAreas.map((area) => {
          const Icon = area.icon;

          return (
            <Card key={area.title}>
              <div
                className={[
                  "flex h-12 w-12 items-center justify-center rounded-md border",
                  area.tone
                ].join(" ")}
              >
                <Icon size={22} />
              </div>
              <h2 className="mt-5 text-xl font-bold text-neutral-950">{area.title}</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {area.description}
              </p>
              <div className="mt-6">
                <Button icon={<ArrowRight size={18} />} variant="secondary">
                  Open Set
                </Button>
              </div>
            </Card>
          );
        })}
      </section>
    </Layout>
  );
}
