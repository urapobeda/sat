"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { groupRequest } from "@/lib/groupApi";
import type { StudyGroup } from "@/lib/groups";

export function GroupsPage({ admin }: { admin: boolean }) {
  const router = useRouter();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(null);
      try {
        const result = await groupRequest<{ groups: StudyGroup[] }>("/api/teacher/groups", "GET", undefined, controller.signal);
        if (!controller.signal.aborted) setGroups(result.groups);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Не удалось загрузить группы.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [retry]);
  async function create(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const result = await groupRequest<{ id: string }>("/api/teacher/groups", "POST", { name: name.trim() });
      router.push(`/teacher/groups/${result.id}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось создать группу."); setSaving(false);
    }
  }
  const visible = groups.filter((group) => showArchived || !group.archived);
  return <section className="space-y-5">
    <div><h1 className="text-3xl font-bold">Группы</h1><p className="mt-2 text-sm text-slate-600">{admin ? "Все группы компании." : "Ваши учебные группы."}</p></div>
    <form onSubmit={create} className="hub-card flex flex-wrap items-end gap-3 p-4">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">Название новой группы<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-transparent px-3" placeholder="Например, SAT · Ноябрь" /></label>
      <button className="hub-primary cursor-pointer disabled:opacity-50" disabled={saving || !name.trim()} type="submit">{saving ? "Создание…" : "Создать группу"}</button>
    </form>
    <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />Показать архивные</label>
    {error ? <p role="alert" className="text-sm text-rose-600">{error} <button type="button" className="cursor-pointer underline" onClick={() => setRetry((value) => value + 1)}>Повторить</button></p> : null}
    {loading ? <p role="status">Загрузка групп…</p> : !error && !visible.length ? <div className="hub-card p-6 text-sm text-slate-600">Групп пока нет. Создайте первую группу и отправьте ученикам приглашение.</div> : (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map((group) => <Link key={group.id} href={`/teacher/groups/${group.id}`} className="hub-card block p-5 transition hover:border-blue-300">
        <h2 className="break-words text-lg font-semibold">{group.name}</h2><p className="mt-2 text-sm text-slate-600">Учеников: {group.member_count}</p>
        {admin ? <p className="mt-1 text-sm text-slate-600">Учитель: {group.teacher_name}</p> : null}
        <p className="mt-3 text-sm">Код: <span className="select-all font-semibold tracking-widest">{group.join_code}</span></p>
        {group.archived ? <p className="mt-2 text-xs text-slate-500">Архивная группа</p> : null}
      </Link>)}</div>
    )}
  </section>;
}
