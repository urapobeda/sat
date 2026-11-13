"use client";
import { useEffect, useState } from "react";
import { useStudentAccount } from "@/components/dashboard/StudentAccount";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { StudyGroup } from "@/lib/groups";

export function MyGroups() {
  const { userId, role } = useStudentAccount();
  const [snapshot, setSnapshot] = useState<{ userId: string; groups: StudyGroup[] } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!userId || role !== "student") return;
    let active = true;
    void Promise.resolve(getSupabaseBrowserClient().rpc("list_my_groups")).then(({ data, error }) => {
      if (!active) return;
      setFailed(error ? userId : null);
      if (!error) setSnapshot({ userId, groups: data ?? [] });
    }).catch(() => { if (active) setFailed(userId); });
    return () => { active = false; };
  }, [userId, role, retry]);
  if (!userId || role !== "student") return null;
  const groups = snapshot?.userId === userId ? snapshot.groups : [];
  return <section className="hub-card p-4 sm:p-5" aria-label="Моя группа">
    <h2 className="text-base font-semibold">{groups.length > 1 ? "Мои группы" : "Моя группа"}</h2>
    {failed === userId ? <p className="mt-2 text-sm text-slate-600">Не удалось загрузить группы. <button className="hub-text-link cursor-pointer underline" type="button" onClick={() => setRetry((value) => value + 1)}>Повторить</button></p> : snapshot?.userId !== userId ? <p role="status" className="mt-2 text-sm text-slate-600">Загрузка…</p> : groups.length ? <ul className="mt-2 space-y-1 text-sm text-slate-600">{groups.map((group) => <li key={group.id} className="break-words"><span className="font-medium">{group.name}</span> · {group.teacher_name}{group.archived ? " · архивная" : ""}</li>)}</ul> : <p className="mt-2 text-sm text-slate-600">Вы пока не вступили в группу. Введите код учителя в меню аккаунта.</p>}
  </section>;
}
