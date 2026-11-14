"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseAuthHeaders } from "@/lib/supabase/authHeaders";
import { isPastDue, type AssignmentKind, type StudentAssignment } from "@/lib/homework";
import { formatAlmaty } from "@/lib/timezone";
import { StudentShell } from "@/components/dashboard/StudentShell";

const KIND_LABEL: Record<AssignmentKind, string> = { past_paper: "Пробный вариант", question_set: "Набор вопросов" };
type Tab = "todo" | "done" | "overdue";
const TABS: { id: Tab; label: string }[] = [
  { id: "todo", label: "Нужно сделать" },
  { id: "done", label: "Сдано" },
  { id: "overdue", label: "Просрочено" }
];

export function StudentHomeworkPage() {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("todo");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/homework", {
          cache: "no-store",
          headers: await getSupabaseAuthHeaders(),
          signal: controller.signal
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Не удалось загрузить домашние задания.");
        if (!controller.signal.aborted) setAssignments(payload.assignments);
      } catch (failure) {
        if (!controller.signal.aborted && !(failure instanceof DOMException)) {
          setError(failure instanceof Error ? failure.message : "Не удалось загрузить домашние задания.");
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
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Домашние задания</h1>
          <p className="mt-2 text-base text-slate-600">
            {grouped.todo.length} нужно сделать · {grouped.overdue.length} просрочено · {grouped.done.length} сдано
          </p>
        </div>

        <div className="flex gap-2 border-b border-slate-200">
          {TABS.map((item) => (
            <button
              className={`relative -mb-px cursor-pointer px-4 py-2.5 text-sm font-semibold ${
                tab === item.id ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500 hover:text-slate-800"
              }`}
              key={item.id}
              onClick={() => setTab(item.id)}
              type="button"
            >
              {item.label} ({grouped[item.id].length})
            </button>
          ))}
        </div>

        {error ? (
          <p className="text-sm text-rose-600" role="alert">
            {error}{" "}
            <button className="cursor-pointer underline" onClick={() => setRetry((value) => value + 1)} type="button">
              Повторить
            </button>
          </p>
        ) : loading ? (
          <p role="status">Загрузка…</p>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
            Здесь пока ничего нет.
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
    ? { done: assignment.correct_count ?? 0, label: "правильно", total: assignment.total_count ?? 0 }
    : total
      ? { done: assignment.answered_count ?? 0, label: "отвечено", total }
      : null;

  const href =
    assignment.kind === "question_set"
      ? `/homework/${assignment.id}`
      : assignment.paper_slug
        ? `/past-papers/${assignment.paper_slug}`
        : "/past-papers";
  const actionLabel = submitted
    ? "Посмотреть результат"
    : assignment.kind === "question_set"
      ? assignment.status === "in_progress"
        ? "Продолжить"
        : "Начать"
      : "Открыть вариант";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">{assignment.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {assignment.group_name} · {KIND_LABEL[assignment.kind]}
        </p>
        <p className="mt-1 text-sm">
          {overdue ? (
            <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
              Срок: {formatAlmaty(assignment.due_at)}
            </span>
          ) : (
            <span className="text-slate-600">Срок: {formatAlmaty(assignment.due_at)}</span>
          )}
        </p>
        {progress ? (
          <div className="mt-2 w-48">
            <p className="text-xs font-semibold text-slate-700">
              {progress.done} / {progress.total} {progress.label}
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }} />
            </div>
          </div>
        ) : null}
      </div>
      {assignment.feedback_submission_id ? <Link className="hub-text-link text-sm" href={`/homework/${assignment.id}?submission=${assignment.feedback_submission_id}`}>Есть комментарий учителя</Link> : null}
      <Link
        className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white! shadow-sm transition hover:bg-blue-700"
        href={href}
      >
        {actionLabel}
      </Link>
    </div>
  );
}
