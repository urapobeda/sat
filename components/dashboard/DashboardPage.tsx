import { Sparkles } from "lucide-react";
import Link from "next/link";
import { BearIcon } from "@/components/dashboard/BearIcon";
import { HomeworkTable } from "@/components/dashboard/HomeworkTable";
import { homeworkRows } from "@/components/dashboard/homeworkData";
import { StudentGreeting } from "@/components/dashboard/StudentAccount";
import { StudentShell } from "@/components/dashboard/StudentShell";

// Draft redesign — student/teacher workflow (schedule, lesson recordings,
// teacher comments) is not implemented in Supabase yet, so all content
// below is placeholder data standing in for that future model.

const topStats = [
  { label: "SAT · Sat, Nov 7", value: "9 days" },
  { label: "Last Practice Test", value: "1330" },
  { label: "Goal", value: "1450" }
];

const practiceTests = [
  { label: "#4 · Oct 26", breakdown: "R&W 660 · M 670", score: 1330, delta: "+60" },
  { label: "#3 · Oct 12", breakdown: "R&W 640 · M 630", score: 1270, delta: "+50" },
  { label: "#2 · Sep 28", breakdown: "R&W 620 · M 600", score: 1220, delta: "+70" },
  { label: "#1 · Sep 14", breakdown: "R&W 590 · M 560", score: 1150, delta: null }
];

const weakTopics = [
  { topic: "Boundaries", accuracy: 52 },
  { topic: "Nonlinear functions", accuracy: 61 },
  { topic: "Inferences", accuracy: 64 },
  { topic: "Circles", accuracy: 67 }
];

function getGreeting(hour: number) {
  if (hour < 6) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getDateLine(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long"
  })
    .format(date)
    .toUpperCase();
}

function getAccuracyColor(percent: number) {
  if (percent < 55) return "bg-rose-500";
  if (percent < 65) return "bg-orange-500";
  if (percent < 75) return "bg-amber-500";
  return "bg-emerald-500";
}

export function DashboardPage() {
  const now = new Date();
  const upcomingHomework = homeworkRows.slice(0, 5);

  return (
    <StudentShell active="home">
      <section className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-b-3xl bg-gradient-to-br from-sky-100 via-blue-50 to-white shadow-sm sm:-mx-8 sm:-mt-8 lg:-mx-10 lg:-mt-10 xl:-mx-12 xl:-mt-12">
        <BearIcon
          className="pointer-events-none absolute left-[26%] top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-blue-200/80 sm:block lg:left-[32%]"
          size={180}
          variant="outline"
        />
        <Sparkles
          className="pointer-events-none absolute left-[18%] top-6 hidden h-5 w-5 text-blue-300 sm:block"
        />
        <Sparkles
          className="pointer-events-none absolute right-28 top-5 hidden h-4 w-4 text-blue-300 sm:block lg:right-40"
        />

        <div className="relative flex flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-12 lg:px-10 lg:py-14 xl:px-12">
          <div className="relative z-10">
            <p className="text-xs font-bold tracking-wide text-slate-500">
              {getDateLine(now)}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              <StudentGreeting greeting={getGreeting(now.getHours())} />
            </h1>
            <p className="mt-2 text-base text-slate-600">
              One assignment is due today by 11:59 PM.
            </p>
          </div>

          <div className="relative z-10 flex gap-3">
            {topStats.map((stat) => (
              <div
                className="rounded-2xl border border-white bg-white/90 px-5 py-3.5 text-center shadow-sm backdrop-blur"
                key={stat.label}
              >
                <p className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-1 text-xl font-bold text-slate-950">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute -top-3 right-6 z-10 sm:-top-4 sm:right-10">
          <span className="absolute -inset-3 rounded-full bg-blue-300/40 blur-xl" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-amber-100 text-amber-800 shadow-lg sm:h-20 sm:w-20">
            <BearIcon size={36} />
          </span>
          <Sparkles className="absolute -left-3 -top-2 h-4 w-4 text-blue-300" />
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl space-y-8">
        <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <main className="space-y-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950">
                Homework
              </h2>
              <Link
                className="text-sm font-semibold text-blue-600 hover:underline"
                href="/homework"
              >
                All assignments
              </Link>
            </div>

            <HomeworkTable rows={upcomingHomework} />
          </section>

          <section className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Mistake Notebook
              </h2>
              <p className="mt-2 text-base leading-7 text-slate-600">
                17 questions are waiting for review. Most mistakes are in
                Boundaries (6) and Nonlinear functions (4).
              </p>
            </div>
            <Link
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold !text-white transition hover:bg-blue-700"
              href="/mistakes"
            >
              Review 10 questions
            </Link>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-slate-950">
              From your teacher
            </h2>
            <p className="mt-3 text-sm text-slate-600">No teacher feedback yet.</p>
          </section>
        </main>

        <aside className="space-y-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Next Lesson
              </p>
              <Link
                className="text-xs font-semibold text-blue-600 hover:underline"
                href="/schedule"
              >
                Full schedule
              </Link>
            </div>
            <p className="mt-3 text-lg font-bold text-slate-950">
              Mon, Nov 2 · 6:00 PM
            </p>
            <p className="mt-1 text-sm text-slate-500">
              90 minutes · SAT Group · November
            </p>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-800">
              Inferences and Command of Evidence: Practice Test #4 review
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                type="button"
              >
                Lesson link
              </button>
              <button
                className="text-left text-xs font-semibold text-blue-600 hover:underline"
                type="button"
              >
                Recording from Oct 28
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-950">
                Practice Tests
              </h2>
              <p className="text-xs font-semibold text-slate-400">
                scale 1000–1600
              </p>
            </div>

            <ul className="mt-4 divide-y divide-slate-100">
              {practiceTests.map((test) => (
                <li className="flex items-center justify-between py-3" key={test.label}>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {test.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{test.breakdown}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-slate-950">
                      {test.score}
                    </p>
                    {test.delta ? (
                      <p className="text-xs font-semibold text-emerald-600">
                        {test.delta}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: "92%" }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500">
                <span>Now 1330</span>
                <span>Goal 1450</span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-950">
              Weak Topics
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Accuracy over the last 30 days
            </p>

            <ul className="mt-5 space-y-4">
              {weakTopics.map((item) => (
                <li key={item.topic}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">
                      {item.topic}
                    </span>
                    <span className="font-semibold text-slate-500">
                      {item.accuracy}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${getAccuracyColor(item.accuracy)}`}
                      style={{ width: `${item.accuracy}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <Link
              className="mt-5 inline-block text-sm font-semibold text-blue-600 hover:underline"
              href="/question-bank"
            >
              Practice weak topics
            </Link>
          </section>
        </aside>
        </div>
      </div>
    </StudentShell>
  );
}
