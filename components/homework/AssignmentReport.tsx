"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { groupRequest } from "@/lib/groupApi";
import { duration, elapsedSeconds, reportCsv, reportPercent, reportStatus, REPORT_STATUS, type ReportRow, type ReportStatus, type analyzeAssignment } from "@/lib/assignmentReport";
import { formatAlmaty } from "@/lib/timezone";
type Report = ReturnType<typeof analyzeAssignment> & { assignment: { due_at: string | null; kind: string }; rows: ReportRow[] };
export function AssignmentReport({ assignmentId }: { assignmentId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState<"all" | ReportStatus>("all");
  const [sort, setSort] = useState("name");
  useEffect(() => {
    const controller = new AbortController();
    void groupRequest<Report>(`/api/teacher/homework/${assignmentId}/report`, "GET", undefined, controller.signal)
      .then((data) => { if (!controller.signal.aborted) { setReport(data); setError(null); } })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load the report."); });
    return () => controller.abort();
  }, [assignmentId, retry]);
  if (error) return <div className="hub-card p-5 text-sm" role="alert">{error} <button type="button" className="hub-text-link cursor-pointer underline" onClick={() => setRetry((n) => n + 1)}>Retry</button></div>;
  if (!report) return <p role="status">Loading results…</p>;
  if (report.assignment.kind !== "question_set") return <div className="hub-card p-5 text-sm text-slate-600">This practice paper is taken through separate exam attempts, which are not yet linked to this homework, so a per-student report is not available for it.</div>;
  const rows = report.rows.filter((row) => filter === "all" || reportStatus(row, report.assignment.due_at) === filter).sort((a, b) => {
    if (sort === "score") return (b.status === "submitted" ? reportPercent(b) ?? -1 : -1) - (a.status === "submitted" ? reportPercent(a) ?? -1 : -1) || a.full_name.localeCompare(b.full_name);
    if (sort === "date") return (Date.parse(b.submitted_at ?? "") || 0) - (Date.parse(a.submitted_at ?? "") || 0);
    if (sort === "status") return REPORT_STATUS[reportStatus(a, report.assignment.due_at)].localeCompare(REPORT_STATUS[reportStatus(b, report.assignment.due_at)]) || a.full_name.localeCompare(b.full_name);
    return a.full_name.localeCompare(b.full_name);
  });
  function download() {
    const url = URL.createObjectURL(new Blob([reportCsv(rows, report!.assignment.due_at)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `homework-${assignmentId}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="space-y-4" aria-label="Assignment results">
    <h2 className="text-xl font-semibold">Assignment results</h2>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Submitted", `${report.summary.submitted} of ${report.summary.total}`], ["Average score", report.summary.average === null ? "—" : `${report.summary.average}%`], ["Late", report.summary.late], ["Not started", report.summary.notStarted]].map(([label, value]) => <div key={label} className="hub-card p-4"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>
    <div className="hub-card space-y-4 p-5">
      <div className="flex flex-wrap items-end gap-3"><label className="flex flex-col gap-1 text-sm">Status<select className="rounded-lg border border-slate-200 bg-transparent p-2" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option value="all">All</option>{Object.entries(REPORT_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex flex-col gap-1 text-sm">Sort by<select className="rounded-lg border border-slate-200 bg-transparent p-2" value={sort} onChange={(e) => setSort(e.target.value)}><option value="name">Name</option><option value="status">Status</option><option value="score">Score ↓</option><option value="date">Submitted at ↓</option></select></label><button className="hub-primary cursor-pointer" type="button" onClick={download}>Export CSV</button></div>
      <p className="text-xs text-slate-500">Each student’s latest attempt is shown. A started retake changes the status to “In progress”. Time runs from the start of the attempt to submission, including breaks. The CSV follows the current filter and sort.</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead><tr>{["Student", "Status", "Score", "Time", "Submitted"].map((title) => <th className="border-b border-slate-200 pb-2 pr-4 font-medium" key={title}>{title}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{rows.map((row) => <tr key={row.student_id}><td className="py-3 pr-4"><Link className="hub-text-link" href={`/teacher/homework/${assignmentId}/student/${row.student_id}`}>{row.full_name}</Link>{!row.is_member ? <span className="block text-xs text-slate-500">Left the group</span> : null}</td><td className="pr-4">{REPORT_STATUS[reportStatus(row, report.assignment.due_at)]}</td><td className="pr-4">{row.status === "submitted" ? `${row.correct_count ?? 0}/${row.total_count ?? 0} · ${reportPercent(row) ?? 0}%` : "—"}</td><td className="pr-4">{duration(elapsedSeconds(row))}</td><td>{row.submitted_at ? formatAlmaty(row.submitted_at) : "—"}</td></tr>)}</tbody></table></div>
      {!rows.length ? <p className="text-sm text-slate-600">No students with this status.</p> : null}
    </div>
    <div className="hub-card space-y-3 p-5"><h3 className="text-lg font-semibold">Questions to review</h3><p className="text-xs text-slate-500">Latest submitted attempts only. A skipped question counts as wrong; questions with more than 50% wrong answers are highlighted.</p>
      {!report.summary.submitted ? <p className="text-sm text-slate-600">Analysis will appear once students submit.</p> : <div className="space-y-2">{report.questions.map((q) => <div key={q.question_id} className={`rounded-xl border p-3 text-sm ${q.needsReview ? "border-amber-300 bg-amber-50 text-slate-900" : "border-slate-200"}`}><p className="font-semibold">Question {q.position} · {q.topic || "No topic"}{q.needsReview ? " · Review in class" : ""}</p><p className="mt-1">Correct: {q.correct}/{q.total} · {q.percent}%</p><p>Most common wrong answer: {q.frequentWrong ?? "—"}{q.frequentWrong ? ` (${q.frequentWrongCount})` : ""} · Skipped: {q.unanswered}</p></div>)}</div>}
    </div>
  </section>;
}
