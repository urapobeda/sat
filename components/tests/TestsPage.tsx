import {
  CheckCheck,
  Clock,
  FileText,
  Sparkles,
  Timer,
  TrendingUp,
  Trophy
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { ScoreProgressChart } from "@/components/tests/ScoreProgressChart";
import { StartTestCTA } from "@/components/tests/StartTestCTA";
import { StatCard } from "@/components/tests/StatCard";
import { TestInformationCard } from "@/components/tests/TestInformationCard";
import { TestListCard } from "@/components/tests/TestListCard";
import type { TestItem } from "@/components/tests/TestRow";

const stats = [
  {
    title: "Tests Taken",
    value: "5",
    description: "Total tests completed",
    icon: FileText,
    tone: "bg-blue-50 text-blue-600"
  },
  {
    title: "Average Score",
    value: "1280 / 1600",
    description: "Across all tests",
    icon: TrendingUp,
    tone: "bg-emerald-50 text-emerald-600"
  },
  {
    title: "Best Score",
    value: "1470 / 1600",
    description: "Achieved on Test 3",
    icon: Trophy,
    tone: "bg-violet-50 text-violet-600"
  },
  {
    title: "Total Time",
    value: "12h 45m",
    description: "Time spent testing",
    icon: Clock,
    tone: "bg-orange-50 text-orange-600"
  }
];

const tests: TestItem[] = [
  {
    title: "Full-Length Test 5",
    sections: 4,
    questions: 154,
    duration: "3h 14m",
    status: "In Progress"
  },
  {
    title: "Full-Length Test 4",
    sections: 4,
    questions: 154,
    duration: "3h 20m",
    score: 1280,
    completedAt: "2 days ago"
  },
  {
    title: "Full-Length Test 3",
    sections: 4,
    questions: 154,
    duration: "3h 18m",
    score: 1470,
    completedAt: "1 week ago"
  },
  {
    title: "Full-Length Test 2",
    sections: 4,
    questions: 154,
    duration: "3h 22m",
    score: 1210,
    completedAt: "2 weeks ago"
  },
  {
    title: "Full-Length Test 1",
    sections: 4,
    questions: 154,
    duration: "3h 15m",
    score: 1150,
    completedAt: "3 weeks ago"
  }
];

export function TestsPage() {
  return (
    <Layout>
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-white p-6 shadow-soft sm:p-8">
        <HeaderIllustration />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              Full-Length Tests
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              Take full-length SAT-style tests under real exam conditions. Track
              your performance and improve your score.
            </p>
          </div>

          <div className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white text-blue-600 shadow-lg shadow-blue-900/10 ring-1 ring-blue-100 lg:flex">
            <Timer size={52} />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <TestListCard tests={tests} />

        <div className="space-y-6">
          <TestInformationCard />
          <ScoreProgressChart />
        </div>
      </section>

      <section className="mt-6">
        <StartTestCTA />
      </section>
    </Layout>
  );
}

function HeaderIllustration() {
  return (
    <div className="pointer-events-none absolute right-[28%] top-6 hidden lg:block">
      <Sparkles className="absolute -left-11 top-9 text-emerald-400" size={17} />
      <Sparkles className="absolute -right-10 top-0 text-violet-500" size={18} />
      <Sparkles className="absolute left-6 -top-4 text-blue-400" size={16} />

      <div className="relative h-28 w-40">
        <div className="absolute left-0 top-0 h-24 w-20 rotate-6 rounded-2xl border-4 border-blue-300 bg-white shadow-lg">
          <div className="mx-auto -mt-2 h-5 w-10 rounded-lg bg-blue-300" />
          <div className="mt-5 space-y-2.5 px-4">
            {[0, 1, 2].map((item) => (
              <div className="flex items-center gap-2" key={item}>
                <CheckCheck className="text-blue-500" size={13} />
                <span className="h-2 flex-1 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 right-0 flex h-20 w-20 items-center justify-center rounded-full border-4 border-blue-500 bg-white text-blue-600 shadow-lg">
          <Timer size={39} />
        </div>
      </div>
    </div>
  );
}
