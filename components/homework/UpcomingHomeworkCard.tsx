"use client";

import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseAuthHeaders } from "@/lib/supabase/authHeaders";
import { isPastDue, type StudentAssignment } from "@/lib/homework";
import { formatAlmaty } from "@/lib/timezone";

export function UpcomingHomeworkCard() {
  const [assignments, setAssignments] = useState<StudentAssignment[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const headers = await getSupabaseAuthHeaders();
        // Guests have no homework; skip the request instead of logging a 403.
        if (!headers.Authorization) return;
        const response = await fetch("/api/homework", {
          cache: "no-store",
          headers,
          signal: controller.signal
        });
        const payload = await response.json();
        if (response.ok && !controller.signal.aborted) setAssignments(payload.assignments);
      } catch {
        // The dashboard stays usable even if this optional widget fails to load.
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  const upcoming = (assignments ?? [])
    .filter((item) => item.status !== "submitted")
    .sort((a, b) => (a.due_at ? Date.parse(a.due_at) : Infinity) - (b.due_at ? Date.parse(b.due_at) : Infinity))
    .slice(0, 3);

  return (
    <section className="hub-card flex flex-col items-start p-5">
      <span className="hub-icon">
        <ClipboardList aria-hidden="true" size={18} />
      </span>
      <h2 className="mt-3 font-semibold text-slate-950">Upcoming homework</h2>
      {upcoming.length === 0 ? (
        <p className="mt-1 flex-1 text-sm leading-6 text-slate-600">No upcoming homework.</p>
      ) : (
        <ul className="mt-2 w-full flex-1 space-y-2">
          {upcoming.map((item) => (
            <li className="flex items-center justify-between gap-2 text-sm" key={item.id}>
              <span className="min-w-0 truncate text-slate-800">{item.title}</span>
              <span className={`shrink-0 text-xs font-semibold ${isPastDue(item.due_at) ? "text-rose-600" : "text-slate-500"}`}>
                {formatAlmaty(item.due_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link className="mt-3 text-sm font-semibold hub-text-link hover:underline" href="/homework">
        All homework
      </Link>
    </section>
  );
}
