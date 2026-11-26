"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudentAccount } from "@/components/dashboard/StudentAccount";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { LessonsPayload } from "@/lib/lessons";

type Snapshot = { userId: string; data: LessonsPayload };

/**
 * Groups, lessons and materials visible to the signed-in user.
 * Row-level security decides what that is: staff see the groups they manage,
 * students see only the groups they joined.
 */
export function useGroupLessons() {
  const { userId, isLoading: accountLoading } = useStudentAccount();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const db = getSupabaseBrowserClient();
    void Promise.all([
      db.rpc("list_my_groups"),
      db.from("group_lessons").select("*").order("starts_at", { ascending: true }).limit(1000),
      db.from("group_materials").select("*").order("created_at", { ascending: false }).limit(1000)
    ]).then(([groups, lessons, materials]) => {
      if (!active) return;
      const error = groups.error ?? lessons.error ?? materials.error;
      if (error) { setFailed(userId); return; }
      setFailed(null);
      setSnapshot({
        userId,
        data: {
          groups: (groups.data ?? []).map(({ id, name, archived }) => ({ id, name, archived })),
          lessons: lessons.data ?? [],
          materials: materials.data ?? []
        }
      });
    }).catch(() => { if (active) setFailed(userId); });
    return () => { active = false; };
  }, [userId, version]);

  const current = snapshot && snapshot.userId === userId ? snapshot.data : null;
  return {
    data: current,
    error: Boolean(userId && failed === userId),
    loading: accountLoading || Boolean(userId && !current && failed !== userId),
    signedIn: Boolean(userId),
    reload
  };
}
