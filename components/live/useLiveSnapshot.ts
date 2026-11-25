"use client";
import { useEffect, useRef, useState } from "react";
import { useStudentAccount } from "@/components/dashboard/StudentAccount";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { groupRequest } from "@/lib/groupApi";
import type { LiveSnapshot } from "@/lib/liveLessons";

export function useLiveSnapshot(code?: string) {
  const { userId, isLoading } = useStudentAccount();
  const [loaded, setLoaded] = useState<{ owner: string; code: string; data: LiveSnapshot } | null>(null);
  const [failure, setFailure] = useState<{ owner: string; code: string; message: string } | null>(null);
  const [connected, setConnected] = useState(false);
  const refresh = useRef(() => {});
  useEffect(() => {
    if (!code || !userId || isLoading) return;
    const controller = new AbortController();
    let active = true, pending = false, queued = false;
    let channel: ReturnType<ReturnType<typeof getSupabaseBrowserClient>["channel"]> | undefined;
    let finished = false;
    async function read() {
      if (!active) return;
      if (pending) { queued = true; return; }
      pending = true;
      try {
        do {
          queued = false;
          const data = await groupRequest<LiveSnapshot>(`/api/live/${code}`, "GET", undefined, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]));
          if (!active) return;
          setLoaded({ owner: userId!, code: code!, data }); setFailure(null);
          finished = data.session.status === "finished";
          if (!channel) {
            const db = getSupabaseBrowserClient();
            channel = db.channel(`live:${data.session.id}:${userId}`)
              .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_sessions", filter: `id=eq.${data.session.id}` }, () => { void read(); });
            if (data.staff) channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "live_answers", filter: `session_id=eq.${data.session.id}` }, () => { void read(); });
            channel.subscribe(status => {
              if (!active) return;
              setConnected(status === "SUBSCRIBED");
              if (status === "SUBSCRIBED") void read(); // Close the initial-read/subscription gap and reconnect gaps.
            });
          }
        } while (active && queued);
      } catch (error) {
        if (active) setFailure({ owner: userId!, code: code!, message: error instanceof Error ? error.message : "Could not refresh live practice." });
      } finally { pending = false; }
    }
    refresh.current = () => { void read(); };
    void read();
    const timer = window.setInterval(() => { if (!finished && document.visibilityState === "visible") void read(); }, 8000);
    const recover = () => { if (document.visibilityState === "visible") void read(); };
    window.addEventListener("online", recover); document.addEventListener("visibilitychange", recover);
    return () => { active = false; controller.abort(); window.clearInterval(timer); window.removeEventListener("online", recover); document.removeEventListener("visibilitychange", recover); if (channel) void getSupabaseBrowserClient().removeChannel(channel).catch(() => {}); refresh.current = () => {}; };
  }, [code, userId, isLoading]);
  const data = loaded && loaded.owner === userId && loaded.code === code ? loaded.data : null;
  const error = failure && failure.owner === userId && failure.code === code ? failure.message : null;
  return { data, error, connected, signedOut: !isLoading && !userId, loading: isLoading || Boolean(userId && code && !data && !error), reload: () => refresh.current() };
}
