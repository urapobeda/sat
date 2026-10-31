import { HomeworkTable } from "@/components/dashboard/HomeworkTable";
import { homeworkRows } from "@/components/dashboard/homeworkData";
import { StudentShell } from "@/components/dashboard/StudentShell";

export function HomeworkPage() {
  const dueSoonCount = homeworkRows.filter((row) => row.dueTone !== "done").length;
  const notStartedCount = homeworkRows.filter((row) => !row.progress).length;
  const completedRows = homeworkRows.filter((row) => row.dueTone === "done");
  const completedPercents = completedRows
    .map((row) => row.percent)
    .filter((percent): percent is number => typeof percent === "number");
  const averageScore = completedPercents.length
    ? Math.round(
        completedPercents.reduce((total, percent) => total + percent, 0) /
          completedPercents.length
      )
    : null;

  const summaryStats = [
    { label: "Due Soon", value: String(dueSoonCount) },
    { label: "Not Started", value: String(notStartedCount) },
    { label: "Completed", value: String(completedRows.length) },
    { label: "Average Score", value: averageScore !== null ? `${averageScore}%` : "—" }
  ];

  return (
    <StudentShell active="homework" title="Student — Homework">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Homework</h1>
          <p className="mt-1 text-sm text-slate-600">
            {homeworkRows.length} assignments from your teacher.
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
              <p className="mt-0.5 text-lg font-black text-slate-950">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <HomeworkTable rows={homeworkRows} />
        </section>
      </div>
    </StudentShell>
  );
}
