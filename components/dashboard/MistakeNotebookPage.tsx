import Link from "next/link";
import { getMistakePracticeHref, mistakeTopics } from "@/components/dashboard/mistakeData";
import { StudentShell } from "@/components/dashboard/StudentShell";

function getAccuracyColor(percent: number) {
  if (percent < 55) return "bg-rose-500";
  if (percent < 65) return "bg-orange-500";
  if (percent < 75) return "bg-amber-500";
  return "bg-emerald-500";
}

export function MistakeNotebookPage() {
  const totalMissed = mistakeTopics.reduce((sum, topic) => sum + topic.missedCount, 0);
  const topicsCount = mistakeTopics.length;
  const weakestTopic = mistakeTopics.reduce((weakest, topic) =>
    topic.accuracy < weakest.accuracy ? topic : weakest
  );
  const mostRecent = mistakeTopics[0];

  const summaryStats = [
    { label: "Questions to Review", value: String(totalMissed) },
    { label: "Topics", value: String(topicsCount) },
    { label: "Weakest Topic", value: weakestTopic.topic },
    { label: "Most Recent Miss", value: mostRecent.lastMissed }
  ];

  return (
    <StudentShell active="mistakes" title="Student — Mistake Notebook">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Mistake Notebook</h1>
          <p className="mt-1 text-sm text-slate-600">
            {totalMissed} questions are waiting for review across {topicsCount}{" "}
            topics.
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-950">
              Missed by Topic
            </h2>
            <p className="text-xs font-semibold text-slate-400">
              Accuracy over the last 30 days
            </p>
          </div>

          <ul className="divide-y divide-slate-100">
            {mistakeTopics.map((topic) => (
              <li
                className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                key={topic.topic}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{topic.topic}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                      {topic.sectionLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {topic.missedCount} missed · last missed {topic.lastMissed}
                  </p>
                  <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${getAccuracyColor(topic.accuracy)}`}
                      style={{ width: `${topic.accuracy}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-start gap-3 sm:justify-end">
                  <span className="text-sm font-bold text-slate-500">
                    {topic.accuracy}%
                  </span>
                  <Link
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold !text-white shadow-sm transition hover:bg-blue-700"
                    href={getMistakePracticeHref(topic)}
                  >
                    Review {topic.missedCount}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </StudentShell>
  );
}
