"use client";
import { useEffect, useState } from "react";
import { getSupabaseAuthHeaders } from "@/lib/supabase/authHeaders";
import type { CourseData } from "@/lib/lessons";

export function useLessons(groupId?: string, scheduled = false) {
  const [data, setData] = useState<CourseData>({ lessons: [], assignments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(null);
      try {
        const headers = await getSupabaseAuthHeaders();
        if (controller.signal.aborted) return;
        setSignedOut(!headers.Authorization);
        if (!headers.Authorization) { setData({ lessons: [], assignments: [] }); return; }
        const query = new URLSearchParams();
        if (groupId) query.set("groupId", groupId);
        if (scheduled) query.set("scheduled", "1");
        const response = await fetch(`/api/lessons?${query}`, { headers, cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load lessons.");
        if (!controller.signal.aborted) setData(body);
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load lessons."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [groupId, scheduled, retry]);
  return { ...data, loading, error, signedOut, reload: () => setRetry(value => value + 1) };
}
