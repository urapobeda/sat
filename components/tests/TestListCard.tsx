import { ChevronDown } from "lucide-react";
import { TestRow, type TestItem } from "@/components/tests/TestRow";

type TestListCardProps = {
  tests: TestItem[];
};

export function TestListCard({ tests }: TestListCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-black text-slate-950">All Tests</h2>

      <div className="mt-5 space-y-3">
        {tests.map((test) => (
          <TestRow key={test.title} test={test} />
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-2.5 text-sm font-black text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          type="button"
        >
          Load More
          <ChevronDown size={17} />
        </button>
      </div>
    </article>
  );
}
