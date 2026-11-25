"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { useStudentAccount } from "@/components/dashboard/StudentAccount";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { GROUP_CODE_PATTERN, normalizeGroupCode } from "@/lib/groups";

export function JoinGroupPage({ code }: { code: string }) {
  return <StudentShell active="home"><JoinGroupPanel code={normalizeGroupCode(code)} /></StudentShell>;
}
function JoinGroupPanel({ code }: { code: string }) {
  const router = useRouter();
  const { userId, isLoading } = useStudentAccount();
  const [result, setResult] = useState<{ userId: string; name: string; teacher: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (isLoading || !GROUP_CODE_PATTERN.test(code)) return;
    if (!userId) { router.replace(`/auth?${new URLSearchParams({ next: `/join/${code}` })}`); return; }
    let active = true;
    async function join() {
      setError(null);
      try {
        const db = getSupabaseBrowserClient();
        const joined = await db.rpc("join_group_by_code", { code });
        if (joined.error) {
          if (joined.error.code === "22023") throw new Error("The code is invalid or the group is archived. Ask your teacher for a new invitation.");
          if (joined.error.code === "42501") throw new Error("Only student accounts can join a group.");
          throw new Error("Could not join the group. Please try again.");
        }
        const group = await db.rpc("list_my_groups", { p_group_id: joined.data });
        // Membership succeeded even if the optional group title cannot be loaded.
        if (active) setResult({ userId: userId!, name: group.data?.[0]?.name ?? "the group", teacher: group.data?.[0]?.teacher_name ?? "" });
      } catch (failure) {
        if (active) setError(failure instanceof Error ? failure.message : "Could not join the group.");
      }
    }
    void join();
    return () => { active = false; };
  }, [code, userId, isLoading, router, retry]);
  const success = result?.userId === userId ? result : null;
  const invalid = !GROUP_CODE_PATTERN.test(code);
  return <section className="hub-card mx-auto max-w-xl space-y-4 p-6 sm:p-8">
    <h1 className="text-3xl font-bold">Group invitation</h1>
    {invalid ? <p role="alert" className="text-sm text-rose-600">Invalid code format. Check the invitation link.</p> : error ? <><p role="alert" className="text-sm text-rose-600">{error}</p><button className="hub-primary cursor-pointer" type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button></> : success ? <><p role="status">You joined {success.name}.</p>{success.teacher ? <p className="text-sm text-slate-600">Teacher: {success.teacher}</p> : null}<Link className="hub-primary" href="/dashboard">Go to dashboard</Link></> : <p role="status" className="text-sm text-slate-600">{isLoading || !userId ? "Checking sign-in…" : "Joining the group…"}</p>}
    {error || invalid ? <Link className="hub-text-link block text-sm" href="/dashboard">Go to dashboard</Link> : null}
  </section>;
}
