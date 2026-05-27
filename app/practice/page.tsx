import { Card } from "@/components/Card";
import { Layout } from "@/components/Layout";
import { questions } from "@/data/questions";
import { practiceAreas } from "@/lib/content";

const sectionLabels = {
  math: "Math",
  "reading-writing": "Reading and Writing"
};

const difficultyStyles = {
  easy: "border-teal-100 bg-teal-50 text-teal-700",
  medium: "border-amber-100 bg-amber-50 text-amber-700",
  hard: "border-rose-100 bg-rose-50 text-rose-700"
};

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
            </Card>
          );
        })}
      </section>

      <section className="mt-14">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-normal text-neutral-500">
            Question bank
          </p>
          <h2 className="mt-2 text-2xl font-bold text-neutral-950">
            Sample SAT questions
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
            A starter local database with original Math and Reading/Writing
            questions. Answer selection can be connected later.
          </p>
        </div>

        <div className="grid gap-4">
          {questions.map((item, index) => (
            <Card key={item.id} className="hover:translate-y-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-neutral-950 px-2.5 py-1 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                    {sectionLabels[item.section]}
                  </span>
                  <span
                    className={[
                      "rounded-md border px-2.5 py-1 text-xs font-semibold capitalize",
                      difficultyStyles[item.difficulty]
                    ].join(" ")}
                  >
                    {item.difficulty}
                  </span>
                </div>
                <span className="text-xs font-medium text-neutral-400">
                  {item.id}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-bold leading-7 text-neutral-950">
                {item.question}
              </h3>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {item.choices.map((choice, choiceIndex) => (
                  <div
                    className="flex min-h-12 items-start gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
                    key={choice}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold text-neutral-900 ring-1 ring-neutral-200">
                      {String.fromCharCode(65 + choiceIndex)}
                    </span>
                    <span className="leading-6">{choice}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </Layout>
  );
}
