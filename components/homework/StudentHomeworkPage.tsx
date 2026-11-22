"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseAuthHeaders } from "@/lib/supabase/authHeaders";
import { isPastDue, type AssignmentKind, type StudentAssignment } from "@/lib/homework";
import { formatAlmaty } from "@/lib/timezone";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { CourseTabs } from "@/components/course/CourseTabs";

const KIND_LABEL: Record<AssignmentKind, string> = { past_paper: "Practice paper", question_set: "Question set" };
type Tab = "todo" | "done" | "overdue";
const TABS: { id: Tab; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "done", label: "Submitted" },
  { id: "overdue", label: "Overdue" }
];

export function StudentHomeworkPage() {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("todo");
  const [retry, setRetry] = useState(0);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const headers = await getSupabaseAuthHeaders();
        if (!headers.Authorization) {
          // Guests have no assignments; show a sign-in prompt instead of a 403 error.
          if (!controller.signal.aborted) {
            setSignedOut(true);
            setLoading(false);
          }
          return;
        }
        setSignedOut(false);
        const response = await fetch("/api/homework", {
          cache: "no-store",
          headers,
          signal: controller.signal
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not load homework.");
        if (!controller.signal.aborted) setAssignments(payload.assignments);
      } catch (failure) {
        if (!controller.signal.aborted && !(failure instanceof DOMException)) {
          setError(failure instanceof Error ? failure.message : "Could not load homework.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retry]);

  const grouped = {
    done: assignments.filter((item) => item.status === "submitted"),
    overdue: assignments.filter((item) => item.status !== "submitted" && isPastDue(item.due_at)),
    todo: assignments.filter((item) => item.status !== "submitted" && !isPastDue(item.due_at))
  };
  const visible = grouped[tab];

  return (
    <StudentShell active="homework">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <CourseTabs active="homework" />
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Homework</h1>
          <p className="mt-2 text-base text-slate-600">
            {grouped.todo.length} to do · {grouped.overdue.length} overdue · {grouped.done.length} submitted
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
          {TABS.map((item) => (
            <button
              className={`relative -mb-px min-h-11 shrink-0 cursor-pointer whitespace-nowrap px-4 py-2.5 text-sm font-semibold ${
                tab === item.id ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-600 hover:text-slate-900"
              }`}
              key={item.id}
              aria-pressed={tab === item.id}
              onClick={() => setTab(item.id)}
              type="button"
            >
              {item.label} ({grouped[item.id].length})
            </button>
          ))}
        </div>

        {signedOut ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
            <p>Sign in to see homework from your teacher.</p>
            <Link className="hub-primary mt-4 inline-flex" href="/auth">
              Sign in
            </Link>
          </div>
        ) : error ? (
          <p className="text-sm text-rose-600" role="alert">
            {error}{" "}
            <button className="cursor-pointer underline" onClick={() => setRetry((value) => value + 1)} type="button">
              Retry
            </button>
          </p>
        ) : loading ? (
          <p role="status">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
            No assignments here yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {visible.map((assignment) => (
              <HomeworkRow assignment={assignment} key={assignment.id} />
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}

function HomeworkRow({ assignment }: { assignment: StudentAssignment }) {
  const submitted = assignment.status === "submitted";
  const overdue = !submitted && isPastDue(assignment.due_at);
  const total = assignment.total_questions ?? assignment.total_count ?? null;
  const progress = submitted
    ? { done: assignment.correct_count ?? 0, label: "correct", total: assignment.total_count ?? 0 }
    : total
      ? { done: assignment.answered_count ?? 0, label: "answered", total }
      : null;

  const href =
    assignment.kind === "question_set"
      ? `/homework/${assignment.id}`
      : assignment.paper_slug
        ? `/past-papers/${assignment.paper_slug}`
        : "/past-papers";
  const actionLabel = submitted
    ? "View result"
    : assignment.kind === "question_set"
      ? assignment.status === "in_progress"
        ? "Continue"
        : "Start"
      : "Open paper";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-slate-900 [overflow-wrap:anywhere]">{assignment.title}</p>
        <p className="mt-0.5 text-xs text-slate-500 [overflow-wrap:anywhere]">
          {assignment.group_name} · {KIND_LABEL[assignment.kind]}
        </p>
        <p className="mt-1 text-sm">
          {overdue ? (
            <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
              Due: {formatAlmaty(assignment.due_at)}
            </span>
          ) : (
            <span className="text-slate-600">Due: {formatAlmaty(assignment.due_at)}</span>
          )}
        </p>
        {progress ? (
          <div className="mt-2 w-full max-w-48">
            <p className="text-xs font-semibold text-slate-700">
              {progress.done} / {progress.total} {progress.label}
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }} />
            </div>
          </div>
        ) : null}
      </div>
      {assignment.feedback_submission_id ? <Link className="hub-text-link text-sm" href={`/homework/${assignment.id}?submission=${assignment.feedback_submission_id}`}>Teacher left a comment</Link> : null}
      <Link
        className="inline-flex min-h-11 w-full shrink-0 cursor-pointer sm:w-auto items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white! shadow-sm transition hover:bg-blue-700"
        href={href}
      >
        {actionLabel}
      </Link>
    </div>
  );
}
