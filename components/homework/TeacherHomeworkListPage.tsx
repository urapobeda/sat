"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { groupRequest } from "@/lib/groupApi";
import type { StudyGroup } from "@/lib/groups";
import type { AssignmentKind, ShowAnswersRule, TeacherAssignment } from "@/lib/homework";
import { almatyInputToUtcIso, formatAlmaty } from "@/lib/timezone";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type PastPaperOption = { id: string; slug: string; title: string };

const KIND_LABEL: Record<AssignmentKind, string> = { past_paper: "Пробный вариант", question_set: "Набор вопросов" };
const SHOW_ANSWERS_LABEL: Record<ShowAnswersRule, string> = {
  after_due: "После срока",
  after_submit: "После сдачи",
  never: "Не показывать"
};

export function TeacherHomeworkListPage({ admin }: { admin: boolean }) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [papers, setPapers] = useState<PastPaperOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);

  const [groupId, setGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<AssignmentKind>("question_set");
  const [paperId, setPaperId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("23:59");
  const [timeLimit, setTimeLimit] = useState("");
  const [showAnswers, setShowAnswers] = useState<ShowAnswersRule>("after_submit");
  const [maxAttempts, setMaxAttempts] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [assignmentResult, groupResult] = await Promise.all([
          groupRequest<{ assignments: TeacherAssignment[] }>("/api/teacher/homework", "GET", undefined, controller.signal),
          groupRequest<{ groups: StudyGroup[] }>("/api/teacher/groups", "GET", undefined, controller.signal)
        ]);
        if (controller.signal.aborted) return;
        setAssignments(assignmentResult.assignments);
        setGroups(groupResult.groups.filter((group) => !group.archived));
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(failure instanceof Error ? failure.message : "Не удалось загрузить домашние задания.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("exam_papers")
      .select("id,slug,title")
      .eq("is_published", true)
      .order("title")
      .then(({ data }) => setPapers(data ?? []));
  }, []);

  async function createAssignment(event: FormEvent) {
    event.preventDefault();
    const dueAt = almatyInputToUtcIso(dueDate, dueTime);
    if (!groupId || !title.trim() || !dueAt || (kind === "past_paper" && !paperId)) {
      setError("Заполните группу, название, срок и (для пробного варианта) вариант.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await groupRequest<{ id: string }>("/api/teacher/homework", "POST", {
        dueAt,
        groupId,
        kind,
        maxAttempts,
        paperId: kind === "past_paper" ? paperId : null,
        showAnswers,
        timeLimitMinutes: timeLimit ? Number(timeLimit) : null,
        title: title.trim()
      });
      router.push(`/teacher/homework/${result.id}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось создать задание.");
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Домашние задания</h1>
        <p className="mt-2 text-sm text-slate-600">{admin ? "Задания всех групп." : "Задания ваших групп."}</p>
      </div>

      <form className="hub-card space-y-3 p-4" onSubmit={createAssignment}>
        <p className="text-sm font-semibold text-slate-700">Новое задание</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[12rem] flex-col gap-1 text-sm font-medium">
            Группа
            <select
              className="min-h-11 rounded-xl border border-slate-200 bg-transparent px-3"
              onChange={(event) => setGroupId(event.target.value)}
              required
              value={groupId}
            >
              <option value="">Выберите группу</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-sm font-medium">
            Название
            <input
              className="min-h-11 rounded-xl border border-slate-200 bg-transparent px-3"
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например, Домашка по линейным уравнениям"
              required
              value={title}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Тип
            <select
              className="min-h-11 rounded-xl border border-slate-200 bg-transparent px-3"
              onChange={(event) => setKind(event.target.value as AssignmentKind)}
              value={kind}
            >
              <option value="question_set">Набор вопросов</option>
              <option value="past_paper">Пробный вариант</option>
            </select>
          </label>
        </div>

        {kind === "past_paper" ? (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Пробный вариант
            <select
              className="min-h-11 max-w-md rounded-xl border border-slate-200 bg-transparent px-3"
              onChange={(event) => setPaperId(event.target.value)}
              value={paperId}
            >
              <option value="">Выберите вариант</option>
              {papers.map((paper) => (
                <option key={paper.id} value={paper.id}>
                  {paper.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Срок — дата (Asia/Almaty)
            <input
              className="min-h-11 rounded-xl border border-slate-200 bg-transparent px-3"
              onChange={(event) => setDueDate(event.target.value)}
              required
              type="date"
              value={dueDate}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Время
            <input
              className="min-h-11 rounded-xl border border-slate-200 bg-transparent px-3"
              onChange={(event) => setDueTime(event.target.value)}
              required
              type="time"
              value={dueTime}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Лимит времени (мин)
            <input
              className="min-h-11 w-32 rounded-xl border border-slate-200 bg-transparent px-3"
              min={1}
              onChange={(event) => setTimeLimit(event.target.value)}
              placeholder="Без лимита"
              type="number"
              value={timeLimit}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Показывать ответы
            <select
              className="min-h-11 rounded-xl border border-slate-200 bg-transparent px-3"
              onChange={(event) => setShowAnswers(event.target.value as ShowAnswersRule)}
              value={showAnswers}
            >
              <option value="after_submit">После сдачи</option>
              <option value="after_due">После срока</option>
              <option value="never">Не показывать</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Попыток
            <input
              className="min-h-11 w-24 rounded-xl border border-slate-200 bg-transparent px-3"
              max={10}
              min={1}
              onChange={(event) => setMaxAttempts(Number(event.target.value) || 1)}
              type="number"
              value={maxAttempts}
            />
          </label>
          <button className="hub-primary cursor-pointer disabled:opacity-50" disabled={saving} type="submit">
            {saving ? "Создание…" : "Создать задание"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="text-sm text-rose-600" role="alert">
          {error}{" "}
          <button className="cursor-pointer underline" onClick={() => setRetry((value) => value + 1)} type="button">
            Повторить
          </button>
        </p>
      ) : null}

      {loading ? (
        <p role="status">Загрузка заданий…</p>
      ) : !assignments.length ? (
        <div className="hub-card p-6 text-sm text-slate-600">Заданий пока нет. Создайте первое задание выше.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {assignments.map((assignment) => (
            <Link className="hub-card block p-5 transition hover:border-blue-300" href={`/teacher/homework/${assignment.id}`} key={assignment.id}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="break-words text-lg font-semibold">{assignment.title}</h2>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    assignment.published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {assignment.published ? "Опубликовано" : "Черновик"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {assignment.group_name} · {KIND_LABEL[assignment.kind]}
              </p>
              <p className="mt-1 text-sm text-slate-600">Срок: {formatAlmaty(assignment.due_at)}</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                {assignment.kind === "question_set" ? `Сдали ${assignment.submitted_count ?? 0} из ${assignment.group_size}` : `Учеников: ${assignment.group_size}`}
              </p>
              <p className="mt-1 text-xs text-slate-500">Ответы: {SHOW_ANSWERS_LABEL[assignment.show_answers]}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
