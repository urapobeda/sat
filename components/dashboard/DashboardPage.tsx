import Link from "next/link";
import { BearIcon } from "@/components/dashboard/BearIcon";
import { HomeworkTable } from "@/components/dashboard/HomeworkTable";
import { homeworkRows } from "@/components/dashboard/homeworkData";
import { StudentShell } from "@/components/dashboard/StudentShell";

// Draft redesign — student/teacher workflow (schedule, lesson recordings,
// teacher comments) is not implemented in Supabase yet, so all content
// below is placeholder data standing in for that future model.

const STUDENT_NAME = "Aliya";

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
      <section className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-b-3xl bg-white shadow-sm sm:-mx-8 sm:-mt-8 lg:-mx-10 lg:-mt-10 xl:-mx-12 xl:-mt-12">
          <div className="relative h-32 w-full sm:h-40 lg:h-44">
            <svg
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              viewBox="0 0 1600 220"
            >
              <defs>
                <linearGradient id="skyGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#bfe3fb" />
                  <stop offset="100%" stopColor="#e8f5fe" />
                </linearGradient>
              </defs>
              <rect fill="url(#skyGradient)" height="220" width="1600" />
              <circle cx="150" cy="45" fill="#ffffff" opacity="0.8" r="22" />
              <circle cx="195" cy="55" fill="#ffffff" opacity="0.8" r="16" />
              <circle cx="1420" cy="40" fill="#ffffff" opacity="0.75" r="26" />
              <circle cx="1465" cy="55" fill="#ffffff" opacity="0.75" r="17" />
              <path
                d="M0,160 C 220,100 420,150 650,130 C 900,108 1120,165 1600,120 L1600,220 L0,220 Z"
                fill="#bfead2"
                opacity="0.65"
              />
              <path
                d="M0,185 C 260,140 520,195 800,170 C 1080,145 1340,200 1600,165 L1600,220 L0,220 Z"
                fill="#ffffff"
              />
            </svg>

            <BearIcon
              className="pointer-events-none absolute bottom-0 right-10 text-white/80 sm:right-16"
              size={96}
              variant="outline"
            />
          </div>

          <div className="relative flex flex-col gap-5 px-6 pb-6 sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:pb-8 lg:px-10 lg:pb-10 xl:px-12 xl:pb-12">
            <span className="absolute -top-8 right-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-amber-100 text-amber-800 shadow-lg sm:-top-9 sm:right-10 sm:h-20 sm:w-20">
              <BearIcon size={36} />
            </span>

            <div>
              <p className="text-xs font-bold tracking-wide text-slate-500">
                {getDateLine(now)}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                {getGreeting(now.getHours())}, {STUDENT_NAME}
              </h1>
              <p className="mt-2 text-base text-slate-600">
                One assignment is due today by 11:59 PM.
              </p>
            </div>

            <div className="flex gap-3">
              {topStats.map((stat) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-center shadow-sm"
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
            <div className="mt-5 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between text-sm">
                <p className="font-semibold text-slate-900">
                  Daniyar · Words in Context #4
                </p>
                <p className="text-xs text-slate-400">Oct 26, 9:10 PM</p>
              </div>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Good work, Aliya. On question 7 you picked a word based on
                the passage&apos;s general meaning, but you need to look at
                the contrast after &quot;however.&quot; Review the
                explanation and do 5 similar questions in the Question
                Bank.
              </p>
            </div>
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
