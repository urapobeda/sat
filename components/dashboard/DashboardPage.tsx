import Link from "next/link";
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
    <StudentShell active="home" title="Student — Home">
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <main className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black tracking-wide text-slate-400">
                {getDateLine(now)}
              </p>
              <h1 className="mt-1 text-2xl font-black text-slate-950">
                {getGreeting(now.getHours())}, {STUDENT_NAME}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                One assignment is due today by 11:59 PM.
              </p>
            </div>

            <div className="flex gap-3">
              {topStats.map((stat) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center shadow-sm"
                  key={stat.label}
                >
                  <p className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-lg font-black text-slate-950">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-black text-slate-950">
                Homework
              </h2>
              <Link
                className="text-sm font-bold text-blue-600 hover:underline"
                href="/homework"
              >
                All assignments
              </Link>
            </div>

            <HomeworkTable rows={upcomingHomework} />
          </section>

          <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-base font-black text-slate-950">
                Mistake Notebook
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                17 questions are waiting for review. Most mistakes are in
                Boundaries (6) and Nonlinear functions (4).
              </p>
            </div>
            <Link
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold !text-white transition hover:bg-slate-800"
              href="/mistakes"
            >
              Review 10 questions
            </Link>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-black text-slate-950">
              From your teacher
            </h2>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between text-sm">
                <p className="font-bold text-slate-900">
                  Daniyar · Words in Context #4
                </p>
                <p className="text-xs text-slate-400">Oct 26, 9:10 PM</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Good work, Aliya. On question 7 you picked a word based on
                the passage&apos;s general meaning, but you need to look at
                the contrast after &quot;however.&quot; Review the
                explanation and do 5 similar questions in the Question
                Bank.
              </p>
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Next Lesson
              </p>
              <Link
                className="text-xs font-bold text-blue-600 hover:underline"
                href="/schedule"
              >
                Full schedule
              </Link>
            </div>
            <p className="mt-2 text-base font-black text-slate-950">
              Mon, Nov 2 · 6:00 PM
            </p>
            <p className="mt-1 text-sm text-slate-500">
              90 minutes · SAT Group · November
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-800">
              Inferences and Command of Evidence: Practice Test #4 review
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                type="button"
              >
                Lesson link
              </button>
              <button
                className="text-left text-xs font-bold text-blue-600 hover:underline"
                type="button"
              >
                Recording from Oct 28
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-950">
                Practice Tests
              </h2>
              <p className="text-xs font-semibold text-slate-400">
                scale 1000–1600
              </p>
            </div>

            <ul className="mt-3 divide-y divide-slate-100">
              {practiceTests.map((test) => (
                <li className="flex items-center justify-between py-2.5" key={test.label}>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {test.label}
                    </p>
                    <p className="text-xs text-slate-500">{test.breakdown}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-950">
                      {test.score}
                    </p>
                    {test.delta ? (
                      <p className="text-xs font-bold text-emerald-600">
                        {test.delta}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: "92%" }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-xs font-semibold text-slate-500">
                <span>Now 1330</span>
                <span>Goal 1450</span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-950">
              Weak Topics
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Accuracy over the last 30 days
            </p>

            <ul className="mt-4 space-y-3">
              {weakTopics.map((item) => (
                <li key={item.topic}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">
                      {item.topic}
                    </span>
                    <span className="font-bold text-slate-500">
                      {item.accuracy}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${getAccuracyColor(item.accuracy)}`}
                      style={{ width: `${item.accuracy}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <Link
              className="mt-4 inline-block text-sm font-bold text-blue-600 hover:underline"
              href="/question-bank"
            >
              Practice weak topics
            </Link>
          </section>
        </aside>
      </div>
    </StudentShell>
  );
}
