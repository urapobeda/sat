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
    <StudentShell active="homework">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Homework</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">Sample workspace · personal data is not connected.</p>
          <p className="mt-2 text-base text-slate-600">
            {homeworkRows.length} example assignments.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {summaryStats.map((stat) => (
            <div
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
              key={stat.label}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {stat.label}
              </p>
              <p className="mt-1 text-xl font-bold text-slate-950">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <HomeworkTable rows={homeworkRows} />
        </section>
      </div>
    </StudentShell>
  );
}
