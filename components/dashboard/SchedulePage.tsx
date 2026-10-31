import { lessons } from "@/components/dashboard/scheduleData";
import { StudentShell } from "@/components/dashboard/StudentShell";

export function SchedulePage() {
  const upcoming = lessons.filter((lesson) => lesson.status === "upcoming");
  const completed = lessons.filter((lesson) => lesson.status === "completed");
  const nextLesson = upcoming[0];

  const summaryStats = [
    { label: "Next Lesson", value: nextLesson ? nextLesson.date : "—" },
    { label: "Upcoming", value: String(upcoming.length) },
    { label: "Completed", value: String(completed.length) },
    { label: "Group", value: "SAT Group" }
  ];

  return (
    <StudentShell active="schedule" title="Student — Schedule">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Schedule</h1>
          <p className="mt-1 text-sm text-slate-600">
            Your upcoming and past lessons with your teacher.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {summaryStats.map((stat) => (
            <div
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              key={stat.label}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {stat.label}
              </p>
              <p className="mt-0.5 truncate text-lg font-black text-slate-950">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-black text-slate-950">
            Upcoming Lessons
          </h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {upcoming.map((lesson) => (
              <li
                className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                key={`${lesson.date}-${lesson.time}`}
              >
                <div>
                  <p className="font-bold text-slate-900">
                    {lesson.date} · {lesson.time}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {lesson.duration} · {lesson.group}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {lesson.topic}
                  </p>
                </div>
                <button
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 sm:w-auto"
                  type="button"
                >
                  Lesson link
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-black text-slate-950">
            Past Lessons
          </h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {completed.map((lesson) => (
              <li
                className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                key={`${lesson.date}-${lesson.time}`}
              >
                <div>
                  <p className="font-bold text-slate-900">
                    {lesson.date} · {lesson.time}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {lesson.duration} · {lesson.group}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {lesson.topic}
                  </p>
                </div>
                {lesson.hasRecording ? (
                  <button
                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-50 sm:w-auto"
                    type="button"
                  >
                    Watch recording
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </StudentShell>
  );
}
