"use client";
import { useState } from "react";
import { GraduationCap, UserRound } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { syncServerSession } from "@/lib/supabase/serverSession";
import type { UserRole } from "@/lib/roles";

export function RoleSwitch({ role, staff = false }: { role: UserRole; staff?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (role === "student") return null;
  async function navigate(href: string) {
    setPending(true);
    setError(null);
    try {
      const { data, error: sessionError } = await getSupabaseBrowserClient().auth.getSession();
      if (sessionError || !data.session) throw new Error("Войдите в аккаунт ещё раз.");
      await syncServerSession(data.session.access_token);
      window.location.assign(href);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось переключить кабинет.");
      setPending(false);
    }
  }
  const label = staff ? "Вид ученика" : "Кабинет учителя";
  return (
    <div className="space-y-1">
      <button aria-label={label} title={label} disabled={pending} onClick={() => void navigate(staff ? "/dashboard" : "/teacher")} type="button" className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50">
        {staff ? <UserRound size={17} /> : <GraduationCap size={17} />}{label}
      </button>
      {error ? <p className="text-xs text-rose-300" role="alert">{error}</p> : null}
    </div>
  );
}
