"use client";

import { PlayCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { formatAlmaty } from "@/lib/timezone";
import { useGroupLessons } from "@/lib/useGroupLessons";

export function LessonRecordingsPage() {
  const { data, error, loading, signedIn, reload } = useGroupLessons();
  const [query, setQuery] = useState("");
  const groupName = useMemo(() => new Map((data?.groups ?? []).map((group) => [group.id, group.name])), [data]);
  const recordings = useMemo(
    () => (data?.lessons ?? []).filter((lesson) => lesson.recording_url).sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
    [data]
  );
  const needle = query.trim().toLowerCase();
  const visible = recordings.filter((lesson) => `${lesson.title} ${lesson.notes ?? ""}`.toLowerCase().includes(needle));
  const totalMinutes = recordings.reduce((sum, lesson) => sum + lesson.duration_minutes, 0);

  const summaryStats = [
    { label: "Recordings", value: String(recordings.length) },
    { label: "Total length", value: `${Math.round((totalMinutes / 60) * 10) / 10}h` },
    { label: "Most recent", value: recordings[0] ? formatAlmaty(recordings[0].starts_at) : "—" },
    { label: "Groups", value: String(data?.groups.filter((group) => !group.archived).length ?? 0) }
  ];

  return (
    <StudentShell active="recordings">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Lesson Recordings</h1>
          <p className="mt-2 text-base text-slate-600">Rewatch past lessons from your SAT group.</p>
        </div>

        {!signedIn && !loading ? (
          <p className="hub-card p-5 text-sm text-slate-600"><Link className="hub-text-link underline" href="/auth">Sign in</Link> to see your recordings.</p>
        ) : error ? (
          <p className="hub-card p-5 text-sm text-rose-600" role="alert">Could not load recordings. <button className="cursor-pointer underline" onClick={reload} type="button">Try again</button></p>
        ) : loading ? (
          <p className="hub-card p-5 text-sm text-slate-600" role="status">Loading recordings…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {summaryStats.map((stat) => (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm" key={stat.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{stat.label}</p>
                  <p className="mt-1 truncate text-xl font-bold text-slate-950">{stat.value}</p>
                </div>
              ))}
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              {recordings.length > 5 ? (
                <input aria-label="Search recordings" className="mb-2 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" onChange={(event) => setQuery(event.target.value)} placeholder="Search by topic" value={query} />
              ) : null}
              {!visible.length ? (
                <p className="text-sm text-slate-500">
                  {recordings.length ? "No recordings match your search." : data?.groups.length ? "Your teacher has not added any recordings yet." : "Join a group with your teacher's code to see lesson recordings."}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {visible.map((lesson) => (
                    <li className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center" key={lesson.id}>
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-slate-900">{lesson.title}</p>
                        <p className="mt-1.5 text-xs text-slate-500">
                          {formatAlmaty(lesson.starts_at)} · {groupName.get(lesson.group_id) ?? "Group"} · {lesson.duration_minutes} min
                        </p>
                      </div>
                      <a className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50" href={lesson.recording_url!} rel="noopener noreferrer" target="_blank">
                        <PlayCircle aria-hidden="true" size={14} />Watch recording
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </StudentShell>
  );
}
