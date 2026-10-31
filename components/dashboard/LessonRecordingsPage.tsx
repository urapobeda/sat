import { recordings } from "@/components/dashboard/recordingsData";
import { StudentShell } from "@/components/dashboard/StudentShell";

function parseLengthToMinutes(length: string) {
  const hoursMatch = length.match(/(\d+)h/);
  const minutesMatch = length.match(/(\d+)m/);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;

  return hours * 60 + minutes;
}

export function LessonRecordingsPage() {
  const totalMinutes = recordings.reduce(
    (sum, recording) => sum + parseLengthToMinutes(recording.length),
    0
  );
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  const summaryStats = [
    { label: "Total Recordings", value: String(recordings.length) },
    { label: "Total Watch Time", value: `${totalHours}h` },
    { label: "Most Recent", value: recordings[0]?.date ?? "—" },
    { label: "Group", value: "SAT Group" }
  ];

  return (
    <StudentShell active="recordings" title="Student — Lesson Recordings">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-950">
            Lesson Recordings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Rewatch past lessons from your SAT group.
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
          <ul className="divide-y divide-slate-100">
            {recordings.map((recording) => (
              <li
                className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                key={recording.title}
              >
                <div>
                  <p className="font-bold text-slate-900">{recording.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {recording.date} · {recording.group} · {recording.length}
                  </p>
                </div>
                <button
                  className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-50 sm:w-auto"
                  type="button"
                >
                  Watch recording
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </StudentShell>
  );
}
