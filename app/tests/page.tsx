import { Layout } from "@/components/Layout";
import { MiniTest } from "@/components/MiniTest";
import { questions } from "@/data/questions";

export default function TestsPage() {
  return (
    <Layout>
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-normal text-violet-700">
          Tests
        </p>
        <h1 className="text-3xl font-bold text-neutral-950 sm:text-5xl">
          SAT Mini Test
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-neutral-600">
          Take a focused timed test, move through questions one by one, and
          review answers with explanations after the session ends.
        </p>
      </section>

      <MiniTest questions={questions} />
    </Layout>
  );
}
