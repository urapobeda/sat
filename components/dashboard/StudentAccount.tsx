"use client";

import { GroupJoinMenuItem } from "@/components/groups/GroupJoinMenuItem";
import { RoleSwitch } from "@/components/staff/RoleSwitch";
import { syncServerSession } from "@/lib/supabase/serverSession";
import { isUserRole, type UserRole } from "@/lib/roles";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePathname } from "next/navigation";
import { ChevronUp, LogOut } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { BearIcon } from "@/components/dashboard/BearIcon";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getProfile } from "@/lib/supabase/queries";
import type { Profile } from "@/types/database";

const StudentAccountContext = createContext<{ isLoading: boolean; name: string | null; role: UserRole; userId?: string }>({
  isLoading: false,
  name: null,
  role: "student"
});

export function StudentAccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const configured = isSupabaseConfigured();
  const userId = user?.id;

  useEffect(() => {
    if (!configured) return;
    const { data: { subscription } } = getSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [configured]);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    void getProfile(userId).then((data) => {
      if (active) setProfile(data);
    }).catch(() => {
      // The session still provides the signup name and email.
    });

    return () => { active = false; };
  }, [userId]);

  const metadataName = user?.user_metadata?.full_name;
  const profileName = profile?.id === userId ? profile?.full_name?.trim() : undefined;
  const name = user
    ? profileName || (typeof metadataName === "string" && metadataName.trim()) || user.email || "Student"
    : null;

  return (
    <StudentAccountContext.Provider value={{ isLoading: configured && user === undefined, name, userId, role: profile?.id === userId && isUserRole(profile?.role) ? profile.role : "student" }}>
      {children}
    </StudentAccountContext.Provider>
  );
}

export function useStudentAccount() {
  return useContext(StudentAccountContext);
}

export function StudentGreeting({ greeting }: { greeting: string }) {
  const { name } = useContext(StudentAccountContext);
  return <>{greeting}{name ? `, ${name}` : ""}!</>;
}

const roleLabels: Record<UserRole, string> = { student: "Ученик", teacher: "Учитель", admin: "Администратор" };

export function StudentAccount({ compact = false }: { compact?: boolean }) {
  const { isLoading, name, role } = useContext(StudentAccountContext);
  const pathname = usePathname();
  const staff = pathname.startsWith("/teacher") || pathname.startsWith("/admin");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 12, bottom: 80 });
  const popover = useRef<HTMLDivElement>(null);
  const menuId = useId();

  async function signOut() {
    setError(null);
    setIsSigningOut(true);
    try {
      await syncServerSession(null);
      const { error: signOutError } = await getSupabaseBrowserClient().auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      popover.current?.hidePopover();
      if (staff) window.location.assign("/");
    } catch {
      setError("Не удалось выйти. Попробуйте ещё раз.");
    } finally { setIsSigningOut(false); }
  }

  return (
    <div className="min-w-0">
      <button
        aria-label={name ? `Меню аккаунта: ${name}` : "Меню аккаунта"}
        aria-expanded={open} aria-controls={menuId} aria-haspopup="dialog"
        className={`flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-xl p-1.5 text-left text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-blue-400 ${compact ? "justify-center" : ""}`}
        disabled={isLoading} popoverTarget={menuId} type="button" title={compact ? name ?? "Аккаунт" : undefined}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 264)), bottom: Math.max(8, Math.min(window.innerHeight - rect.top + 8, window.innerHeight - 280)) });
        }}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-600 text-white"><BearIcon size={20} /></span>
        {!compact ? <><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{isLoading ? "Загрузка…" : name ?? "Войти"}</span><span className="block text-xs text-slate-400">{name ? roleLabels[role] : "Сохраняйте прогресс"}</span></span><ChevronUp aria-hidden="true" className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} size={15} /></> : null}
      </button>
      <div
        ref={popover} popover="auto" id={menuId} role="dialog" aria-label="Действия аккаунта"
        onToggle={(event) => setOpen(event.currentTarget.matches(":popover-open"))}
        className="fixed m-0 w-64 max-w-[calc(100vw-1rem)] rounded-xl border border-white/15 bg-[#15233b] p-1.5 text-slate-100 shadow-xl shadow-black/25"
        style={{ inset: "auto", left: position.left, bottom: position.bottom }}
      >
        {name ? <RoleSwitch role={role} staff={staff} /> : <Link href="/auth" className="block rounded-lg px-3 py-2.5 text-sm hover:bg-white/10">Войти</Link>}
        {name && role === "student" ? <GroupJoinMenuItem /> : null}
        <ThemeToggle menuItem />
        {name ? <button className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50" disabled={isSigningOut} onClick={() => void signOut()} type="button"><LogOut aria-hidden="true" size={17} />{isSigningOut ? "Выход…" : "Выйти"}</button> : null}
        {error ? <p className="px-3 py-2 text-xs text-rose-300" role="alert">{error}</p> : null}
      </div>
    </div>
  );
}
