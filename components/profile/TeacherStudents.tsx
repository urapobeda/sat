"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { groupRequest } from "@/lib/groupApi";
type Row = {
  id: string;
  name: string;
  groups: string;
  score: number | null;
  target: number | null;
  accuracy: number | null;
  homework: string;
  lastActivity: string | null;
};
export function TeacherStudents() {
  const [rows, setRows] = useState<Row[]>([]);
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    groupRequest<{ students: Row[]; hasMore: boolean }>(
      `/api/teacher/students?offset=${offset}&q=${encodeURIComponent(query)}`,
      "GET",
      undefined,
      c.signal,
    )
      .then((r) => {
        if (c.signal.aborted) return;
        setRows((prev) =>
          offset
            ? [
                ...prev.filter((p) => !r.students.some((s) => s.id === p.id)),
                ...r.students,
              ]
            : r.students,
        );
        setMore(r.hasMore);
        setError(null);
        setLoading(false);
      })
      .catch((e) => {
        if (!c.signal.aborted) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => c.abort();
  }, [offset, retry, query]);
  const filtered = [...rows].sort((a, b) =>
    sort === "name"
      ? a.name.localeCompare(b.name)
      : sort === "activity"
        ? (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "")
        : (b[sort as "score" | "accuracy"] ?? -1) -
          (a[sort as "score" | "accuracy"] ?? -1),
  );
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Students</h1>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          Search students
          <input
            className="ml-2 rounded-lg border p-2"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOffset(0);
              setLoading(true);
            }}
          />
        </label>
        <label className="text-sm">
          Sort
          <select
            className="ml-2 rounded-lg border bg-transparent p-2"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="name">Name</option>
            <option value="score">Latest score</option>
            <option value="accuracy">Accuracy</option>
            <option value="activity">Last activity</option>
          </select>
        </label>
      </div>
      {error ? (
        <p role="alert">
          {error}{" "}
          <button className="underline" onClick={() => setRetry((n) => n + 1)}>
            Retry
          </button>
        </p>
      ) : null}
      <div className="hub-card overflow-x-auto p-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {[
                "Name",
                "Group",
                "Last score",
                "Target",
                "Accuracy",
                "Homework",
                "Last activity",
              ].map((s) => (
                <th className="p-2" key={s}>
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-slate-200">
                <td className="p-2">
                  <Link
                    className="hub-text-link"
                    href={`/teacher/students/${r.id}`}
                  >
                    {r.name}
                  </Link>
                </td>
                <td>{r.groups || "—"}</td>
                <td>{r.score ?? "—"}</td>
                <td>{r.target ?? "—"}</td>
                <td>{r.accuracy === null ? "—" : r.accuracy + "%"}</td>
                <td>{r.homework}</td>
                <td>
                  {r.lastActivity
                    ? new Date(r.lastActivity).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading ? (
          <p role="status">Loading students…</p>
        ) : !rows.length ? (
          <p>No students in your groups.</p>
        ) : null}
      </div>
      {more ? (
        <button
          className="hub-primary cursor-pointer"
          onClick={() => {
            setLoading(true);
            setOffset(rows.length);
          }}
          disabled={loading}
        >
          Load more students
        </button>
      ) : null}
    </section>
  );
}
