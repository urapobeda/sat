"use client";

import { AssignmentReport } from "@/components/homework/AssignmentReport";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { groupRequest } from "@/lib/groupApi";
import type { Assignment } from "@/types/database";
import type { AssignmentRosterRow, ShowAnswersRule } from "@/lib/homework";
import { almatyInputToUtcIso, utcIsoToAlmatyInput } from "@/lib/timezone";
import { QuestionPicker } from "@/components/homework/QuestionPicker";

type DetailResponse = {
  assignment: Assignment;
  questions: { question_id: string; position: number }[];
  roster: AssignmentRosterRow[];
};


export function TeacherHomeworkEditPage({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [showAnswers, setShowAnswers] = useState<ShowAnswersRule>("after_submit");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await groupRequest<DetailResponse>(`/api/teacher/homework/${assignmentId}`, "GET", undefined, controller.signal);
        if (controller.signal.aborted) return;
        setDetail(result);
        setTitle(result.assignment.title);
        setInstructions(result.assignment.instructions);
        const due = utcIsoToAlmatyInput(result.assignment.due_at);
        setDueDate(due.date);
        setDueTime(due.time);
        setTimeLimit(result.assignment.time_limit_minutes ? String(result.assignment.time_limit_minutes) : "");
        setShowAnswers(result.assignment.show_answers);
        setMaxAttempts(result.assignment.max_attempts);
        setQuestionIds(result.questions.sort((a, b) => a.position - b.position).map((item) => item.question_id));
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Не удалось загрузить задание.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [assignmentId, retry]);

  async function saveDetails() {
    const dueAt = almatyInputToUtcIso(dueDate, dueTime);
    if (!title.trim() || !dueAt) {
      setError("Укажите название и срок сдачи.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await groupRequest(`/api/teacher/homework/${assignmentId}`, "PATCH", {
        action: "update",
        dueAt,
        instructions,
        maxAttempts,
        showAnswers,
        timeLimitMinutes: timeLimit ? Number(timeLimit) : null,
        title: title.trim()
      });
      setMessage("Сохранено.");
      setRetry((value) => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось сохранить задание.");
    } finally {
      setSaving(false);
    }
  }

  async function saveQuestions() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await groupRequest(`/api/teacher/homework/${assignmentId}`, "PATCH", { action: "set_questions", questionIds });
      setMessage("Вопросы сохранены.");
      setRetry((value) => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось сохранить вопросы.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(published: boolean) {
    setSaving(true);
    setError(null);
    try {
      await groupRequest(`/api/teacher/homework/${assignmentId}`, "PATCH", { action: "publish", published });
      setRetry((value) => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось изменить публикацию.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAssignment() {
    if (!window.confirm("Удалить это задание?")) return;
    setSaving(true);
    setError(null);
    try {
      await groupRequest(`/api/teacher/homework/${assignmentId}`, "DELETE");
      router.push("/teacher/homework");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось удалить задание.");
      setSaving(false);
    }
  }

  if (loading) return <p role="status">Загрузка задания…</p>;
  if (error && !detail) {
    return (
      <p className="text-sm text-rose-600" role="alert">
        {error}
      </p>
    );
  }
  if (!detail) return null;

  const hasSubmissions = detail.roster.some((row) => Boolean(row.status));

  return (
    <section className="space-y-5">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700" href="/teacher/homework">
        <ArrowLeft size={16} />
        Все задания
      </Link>

      {error ? (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}

      <h1 className="text-3xl font-bold">{detail.assignment.title}</h1>
      <AssignmentReport key={retry} assignmentId={assignmentId} />
      <button className="hub-text-link cursor-pointer text-sm font-semibold" type="button" aria-expanded={editing} onClick={() => setEditing(!editing)}>{editing ? "Скрыть настройки" : "Настройки задания и вопросы"}</button>
      {editing ? <>
      <div className="hub-card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Настройки</h2>
          <div className="flex gap-2">
            <button
              className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              disabled={saving}
              onClick={() => togglePublished(!detail.assignment.published)}
              type="button"
            >
              {detail.assignment.published ? "Снять с публикации" : "Опубликовать"}
            </button>
            <button
              className="cursor-pointer rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              disabled={saving || hasSubmissions}
              onClick={deleteAssignment}
              title={hasSubmissions ? "Нельзя удалить: есть сдачи учеников" : undefined}
              type="button"
            >
              Удалить
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-600">{detail.assignment.published ? "Опубликовано" : "Черновик"}</p>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Название
          <input
            className="min-h-11 rounded-xl border border-slate-200 bg-transparent px-3"
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Инструкция для учеников
          <textarea
            className="min-h-24 rounded-xl border border-slate-200 bg-transparent px-3 py-2"
            maxLength={5000}
            onChange={(event) => setInstructions(event.target.value)}
            value={instructions}
          />
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Срок — дата (Asia/Almaty)
            <input
              className="min-h-11 rounded-xl border border-slate-200 bg-transparent px-3"
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              value={dueDate}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Время
            <input
              className="min-h-11 rounded-xl border border-slate-200 bg-transparent px-3"
              onChange={(event) => setDueTime(event.target.value)}
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
        </div>
        <button className="hub-primary cursor-pointer disabled:opacity-50" disabled={saving} onClick={saveDetails} type="button">
          Сохранить
        </button>
      </div>

      {detail.assignment.kind === "question_set" ? (
        <div className="hub-card space-y-4 p-5">
          <h2 className="text-lg font-semibold">Вопросы задания</h2>
          {hasSubmissions ? <p className="text-sm text-slate-600">Вопросы зафиксированы после начала выполнения.</p> : <QuestionPicker onChange={setQuestionIds} selectedIds={questionIds} />}
          <button className="hub-primary cursor-pointer disabled:opacity-50" disabled={saving || hasSubmissions || questionIds.length === 0} onClick={saveQuestions} type="button">
            Сохранить вопросы
          </button>
        </div>
      ) : (
        <div className="hub-card p-5 text-sm text-slate-600">
          Это задание ссылается на готовый пробный вариант. Прогресс учеников отслеживается через обычный прогон варианта.
        </div>
      )}


      </> : null}
    </section>
  );
}
