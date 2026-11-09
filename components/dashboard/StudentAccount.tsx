"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { BearIcon } from "@/components/dashboard/BearIcon";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getProfile } from "@/lib/supabase/queries";
import type { Profile } from "@/types/database";

const StudentAccountContext = createContext<{ isLoading: boolean; name: string | null }>({
  isLoading: false,
  name: null
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
    <StudentAccountContext.Provider value={{ isLoading: configured && user === undefined, name }}>
      {children}
    </StudentAccountContext.Provider>
  );
}

export function StudentGreeting({ greeting }: { greeting: string }) {
  const { name } = useContext(StudentAccountContext);
  return <>{greeting}{name ? `, ${name}` : ""}! 👋</>;
}

export function StudentAccount() {
  const { isLoading, name } = useContext(StudentAccountContext);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setError(null);
    setIsSigningOut(true);
    try {
      const { error: signOutError } = await getSupabaseBrowserClient().auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
    } catch {
      setError("Could not sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
          <BearIcon size={20} />
        </span>
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading account…</p>
        ) : name ? (
          <>
            <Link className="min-w-0 flex-1" href="/progress" title={name}>
              <p className="truncate text-sm font-semibold text-white">{name}</p>
              <p className="text-xs text-slate-400">Student · Progress</p>
            </Link>
            <button
              aria-label="Sign out"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
              disabled={isSigningOut}
              onClick={signOut}
              title="Sign out"
              type="button"
            >
              <LogOut aria-hidden="true" size={18} />
            </button>
          </>
        ) : (
          <Link className="min-w-0 flex-1" href="/auth">
            <p className="text-sm font-semibold text-white">Sign in</p>
            <p className="text-xs text-slate-400">Save your progress</p>
          </Link>
        )}
      </div>
      {error && name ? <p className="mt-2 text-xs text-rose-300" role="alert">{error}</p> : null}
    </div>
  );
}
