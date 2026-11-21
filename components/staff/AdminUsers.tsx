"use client";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabaseAuthHeaders } from "@/lib/supabase/authHeaders";
import type { UserRole } from "@/lib/roles";

type UserRow = { id: string; full_name: string | null; email: string | null; role: UserRole; created_at: string };
const roleLabels: Record<UserRole, string> = { student: "Student", teacher: "Teacher", admin: "Admin" };
export function AdminUsers({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({ search: "", page: 1, retry: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, UserRole>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const headers = await getSupabaseAuthHeaders();
        const response = await fetch(`/api/admin/users?${new URLSearchParams({ search: query.search, page: String(query.page) })}`, { headers, signal: controller.signal, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not load users.");
        if (!controller.signal.aborted) { setUsers(payload.users); setTotal(payload.total); setSelected({}); }
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load users.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [query]);

  function searchUsers(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    setQuery((current) => ({ ...current, page: 1, search: search.trim() }));
  }
  async function saveRole(user: UserRow) {
    setSaving(user.id);
    setError(null);
    setNotice(null);
    const role = selected[user.id] ?? user.role;
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH", headers: { "Content-Type": "application/json", ...await getSupabaseAuthHeaders() },
        body: JSON.stringify({ userId: user.id, role })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not change the role.");
      setUsers((current) => current.map((row) => row.id === user.id ? { ...row, role } : row));
      setNotice("Role saved.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not change the role.");
    } finally { setSaving(null); }
  }

  return (
    <section className="space-y-5">
      <div><h1 className="text-3xl font-bold">Users</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Organization accounts and access rights. Student results are not affected.</p></div>
      <form onSubmit={searchUsers} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">Search by name or email
          <input maxLength={200} value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-900 dark:bg-slate-900 dark:text-white" type="search" />
        </label>
        <button disabled={Boolean(saving)} className="hub-primary cursor-pointer disabled:opacity-50" type="submit">Search</button>
      </form>
      {error ? <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error} <button type="button" className="cursor-pointer underline" onClick={() => setQuery((current) => ({ ...current, retry: current.retry + 1 }))}>Retry</button></p> : null}
      {notice ? <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p> : null}
      <div className="hub-card overflow-x-auto p-4 sm:p-6" aria-busy={loading}>
        {loading ? <p role="status">Loading users…</p> : !users.length ? <p>No users found.</p> : (
          <table className="w-full min-w-[660px] text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500"><tr>{["Name", "Email", "Role", "Signed up", "Action"].map((label) => <th key={label} scope="col" className="pb-3 pr-4 font-medium">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-200">{users.map((user) => (
              <tr key={user.id}>
                <td className="py-3 pr-4">{user.full_name || "No name"}{user.id === currentUserId ? " (you)" : ""}</td>
                <td className="py-3 pr-4">{user.email || "—"}</td>
                <td className="py-3 pr-4"><select aria-label={`Role: ${user.email ?? user.id}`} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-900 disabled:opacity-60 dark:bg-slate-900 dark:text-white" disabled={user.id === currentUserId || Boolean(saving)} value={selected[user.id] ?? user.role} onChange={(event) => setSelected((current) => ({ ...current, [user.id]: event.target.value as UserRole }))}>
                  {(Object.keys(roleLabels) as UserRole[]).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                </select></td>
                <td className="py-3 pr-4">{new Date(user.created_at).toLocaleDateString("en-US")}</td>
                <td className="py-3"><button type="button" onClick={() => void saveRole(user)} disabled={Boolean(saving) || user.id === currentUserId || !selected[user.id] || selected[user.id] === user.role} className="hub-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">{saving === user.id ? "Saving…" : "Save"}</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p>Page {query.page}{total ? ` · Total: ${total}` : ""}</p>
        <div className="flex gap-2">
          <button className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-50" type="button" disabled={query.page === 1 || loading || Boolean(saving)} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}>Previous</button>
          <button className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-50" type="button" disabled={query.page * 50 >= total || loading || Boolean(saving)} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}>Next</button>
        </div>
      </div>
    </section>
  );
}
