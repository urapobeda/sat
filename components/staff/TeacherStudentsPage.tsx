"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStudentAccount } from "@/components/dashboard/StudentAccount";
import type { GroupMember, StudyGroup } from "@/lib/groups";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatAlmaty } from "@/lib/timezone";

type StudentRow = { id: string; name: string; groups: { id: string; name: string; joinedAt: string }[] };

/** Everyone in the groups this teacher manages (admins see all groups). */
export function TeacherStudentsPage() {
  const { userId } = useStudentAccount();
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [groupCount, setGroupCount] = useState(0);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const db = getSupabaseBrowserClient();
    void (async () => {
      const { data: groups, error } = await db.rpc("list_my_groups");
      if (error) throw error;
      const visibleGroups = (groups ?? []).filter((group: StudyGroup) => showArchived || !group.archived);
      const rosters = await Promise.all(visibleGroups.map(async (group: StudyGroup) => {
        const result = await db.rpc("get_group_members", { p_group_id: group.id });
        if (result.error) throw result.error;
        return { group, members: (result.data ?? []) as GroupMember[] };
      }));
      const byStudent = new Map<string, StudentRow>();
      for (const { group, members } of rosters) for (const member of members) {
        const row = byStudent.get(member.student_id) ?? { id: member.student_id, name: member.full_name?.trim() || "Без имени", groups: [] };
        row.groups.push({ id: group.id, name: group.name, joinedAt: member.joined_at });
        byStudent.set(member.student_id, row);
      }
      if (!active) return;
      setGroupCount(visibleGroups.length);
      setRows([...byStudent.values()].sort((a, b) => a.name.localeCompare(b.name, "ru")));
      setFailed(false);
    })().catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [userId, retry, showArchived]);

  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => (rows ?? []).filter((row) =>
    `${row.name} ${row.groups.map((group) => group.name).join(" ")}`.toLowerCase().includes(needle)
  ), [rows, needle]);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Ученики</h1>
        <p className="mt-2 text-sm text-slate-600">Все ученики ваших групп. Чтобы добавить ученика, отправьте ему код группы из раздела «Группы».</p>
      </div>
      <div className="hub-card flex flex-wrap items-center gap-3 p-3">
        <input aria-label="Поиск" className="min-h-10 min-w-0 flex-1 basis-48 rounded-xl border border-slate-200 bg-transparent px-3 text-sm" placeholder="Поиск по имени или группе" value={query} onChange={(event) => setQuery(event.target.value)} />
        <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />Архивные группы</label>
      </div>
      {failed ? (
        <p role="alert" className="text-sm text-rose-600">Не удалось загрузить учеников. <button type="button" className="cursor-pointer underline" onClick={() => setRetry((value) => value + 1)}>Повторить</button></p>
      ) : rows === null ? <p role="status">Загрузка…</p> : !rows.length ? (
        <div className="hub-card p-6 text-sm text-slate-600">{groupCount ? "В ваших группах пока нет учеников. Отправьте им код или ссылку-приглашение." : "Сначала создайте группу в разделе «Группы»."}</div>
      ) : (
        <div className="hub-card overflow-x-auto">
          <p className="px-4 pt-3 text-sm text-slate-600" role="status">Учеников: {visible.length}{needle ? ` из ${rows.length}` : ""}</p>
          <table className="mt-1 w-full min-w-[32rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-2 font-semibold">Ученик</th><th className="px-4 py-2 font-semibold">Группы</th><th className="px-4 py-2 font-semibold">В группе с</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">{row.groups.map((group, index) => <span key={group.id}>{index ? ", " : ""}<Link className="hub-text-link hover:underline" href={`/teacher/groups/${group.id}`}>{group.name}</Link></span>)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatAlmaty(row.groups.map((group) => group.joinedAt).sort()[0])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
