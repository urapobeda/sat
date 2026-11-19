"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { groupRequest } from "@/lib/groupApi";
import type { StudyGroup, GroupMember, GroupTeacher } from "@/lib/groups";

export function GroupDetail({ groupId, admin }: { groupId: string; admin: boolean }) {
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [teacherError, setTeacherError] = useState(false);
  const [teachers, setTeachers] = useState<GroupTeacher[]>([]);
  const [name, setName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [origin, setOrigin] = useState("");
  const endpoint = `/api/teacher/groups/${groupId}`;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(null); setOrigin(window.location.origin);
      try {
        const result = await groupRequest<{ group: StudyGroup; members: GroupMember[] }>(endpoint, "GET", undefined, controller.signal);
        if (!controller.signal.aborted) { setGroup(result.group); setName(result.group.name); setTeacherId(result.group.teacher_id); setMembers(result.members); }
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load the group.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    if (admin) void groupRequest<{ teachers: GroupTeacher[] }>("/api/teacher/groups/teachers", "GET", undefined, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setTeachers(result.teachers); setTeacherError(false); } })
      .catch(() => { if (!controller.signal.aborted) setTeacherError(true); });
    return () => controller.abort();
  }, [endpoint, admin, retry]);

  async function change(body: unknown, method = "PATCH") {
    setSaving(true); setError(null); setNotice(null);
    try { await groupRequest(endpoint, method, body); setNotice("Changes saved."); setRetry((value) => value + 1); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not update the group."); }
    finally { setSaving(false); }
  }
  async function copy(value: string) {
    setNotice(null); setError(null);
    try { await navigator.clipboard.writeText(value); setNotice("Copied."); }
    catch { setError("Could not copy. Select the text and copy it manually."); }
  }
  function rename(event: FormEvent) { event.preventDefault(); void change({ action: "rename", name: name.trim() }); }
  const invitation = group ? `${origin}/join/${group.join_code}` : "";
  return <section className="space-y-5">
    <Link className="hub-text-link text-sm" href="/teacher/groups">← All groups</Link>
    {notice ? <p role="status" className="text-sm text-emerald-700">{notice}</p> : null}
    {error ? <p role="alert" className="text-sm text-rose-600">{error} <button type="button" className="cursor-pointer underline" onClick={() => setRetry((value) => value + 1)}>Retry</button></p> : null}
    {loading ? <p role="status">Loading group…</p> : group ? <>
      <div className="hub-card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="break-words text-3xl font-bold">{group.name}</h1><button disabled={saving} type="button" className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-50" onClick={() => void change({ action: "archive", archived: !group.archived })}>{group.archived ? "Restore from archive" : "Archive"}</button></div>
        {group.archived ? <p className="text-sm text-slate-600">This group is archived. New students cannot join.</p> : null}
        <p className="text-sm text-slate-600">Teacher: {group.teacher_name}</p>
        <form onSubmit={rename} className="flex flex-wrap items-end gap-3"><label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">Name<input className="min-h-11 rounded-xl border border-slate-200 bg-transparent px-3" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} /></label><button className="hub-primary cursor-pointer disabled:opacity-50" type="submit" disabled={saving || !name.trim() || name.trim() === group.name}>Rename</button></form>
        {admin ? <form onSubmit={(event) => { event.preventDefault(); void change({ action: "transfer", teacherId }); }} className="flex flex-wrap items-end gap-3"><label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">Group teacher<select className="min-h-11 rounded-xl border border-slate-200 bg-transparent px-3" value={teacherId} onChange={(event) => setTeacherId(event.target.value)} disabled={!teachers.length || saving}>{!teachers.some((teacher) => teacher.id === group.teacher_id) ? <option value={group.teacher_id}>{group.teacher_name}</option> : null}{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name} · {teacher.id.slice(0, 8)}</option>)}</select></label><button type="submit" className="hub-primary cursor-pointer disabled:opacity-50" disabled={saving || !teachers.length || teacherId === group.teacher_id}>Change teacher</button></form> : null}
        {admin && teacherError ? <p role="status" className="text-sm text-slate-600">Could not load the teacher list. <button type="button" className="hub-text-link cursor-pointer underline" onClick={() => setRetry((value) => value + 1)}>Retry</button></p> : null}
      </div>
      <div className="hub-card space-y-3 p-5"><h2 className="text-lg font-semibold">Invitation</h2>
        <div className="flex flex-wrap items-center gap-3"><span className="select-all text-xl font-semibold tracking-widest">{group.join_code}</span><button className="hub-text-link cursor-pointer text-sm" type="button" onClick={() => void copy(group.join_code)}>Copy code</button><button className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50" type="button" disabled={saving} onClick={() => void change({ action: "rotate-code" })}>New code</button></div>
        <div className="flex flex-wrap items-center gap-3"><span className="min-w-0 select-all break-all text-sm text-slate-600">{invitation}</span><button className="hub-text-link cursor-pointer text-sm" type="button" onClick={() => void copy(invitation)}>Copy link</button></div>
        <p className="text-xs text-slate-500">After changing the code, old invitations stop working. Current members stay in the group.</p>
      </div>
      <div className="hub-card p-5"><h2 className="text-lg font-semibold">Students · {members.length}</h2>
        {!members.length ? <p className="mt-3 text-sm text-slate-600">No members yet. Send your students the invitation link.</p> : <ul className="mt-3 divide-y divide-slate-200">{members.map((member) => <li key={member.student_id} className="flex flex-wrap items-center gap-3 py-3">
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-100 text-blue-700">{member.avatar_url?.startsWith("https://") ? (
            // External provider avatars are not routed through the image optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.avatar_url} alt="" className="size-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
          ) : member.full_name.slice(0, 1)}</span>
          <span className="min-w-0 flex-1 break-words text-sm font-medium">{member.full_name}</span><button disabled={saving} className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50" type="button" onClick={() => void change({ studentId: member.student_id }, "DELETE")}>Remove from group</button>
        </li>)}</ul>}
      </div>
    </> : null}
  </section>;
}
