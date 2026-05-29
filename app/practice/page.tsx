import { Layout } from "@/components/Layout";
import { PracticeQuiz } from "@/components/PracticeQuiz";
import { questions } from "@/data/questions";

export default function PracticePage() {
  return (
    <Layout>
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">
          Practice
        </p>
        <h1 className="text-3xl font-bold text-neutral-950 sm:text-5xl">
          Solve SAT questions
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-neutral-600">
          Work through one question at a time, lock in your answer, then review
          the explanation before moving forward.
        </p>
      </section>

      <PracticeQuiz questions={questions} />
    </Layout>
  );
}
