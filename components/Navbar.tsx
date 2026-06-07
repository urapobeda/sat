"use client";

import { ArrowRight, GraduationCap, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured
} from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/question-bank", label: "Question Bank" },
  { href: "/tests", label: "Tests" },
  { href: "/progress", label: "Progress" },
  { href: "/converter", label: "Converter" }
];

export function Navbar() {
  const pathname = usePathname();
  const supabaseConfigured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(!supabaseConfigured);

  useEffect(() => {
    if (!supabaseConfigured) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    supabase.auth
      .getUser()
      .then(({ data }) => setUser(data.user))
      .finally(() => setIsAuthReady(true));

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, [supabaseConfigured]);

  async function handleSignOut() {
    if (!supabaseConfigured) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link className="flex min-w-0 items-center gap-3" href="/">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <GraduationCap size={24} />
            </span>
            <span className="truncate text-lg font-extrabold text-slate-950">
              <span className="text-blue-600">SAT</span> Practice Hub
            </span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <button
                className="inline-flex min-h-11 max-w-48 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 text-sm font-bold text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                onClick={handleSignOut}
                type="button"
              >
                <UserRound size={17} />
                <span className="truncate">Sign out</span>
              </button>
            ) : (
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 text-sm font-bold text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                href="/auth"
              >
                <UserRound size={17} />
                <span>{isAuthReady ? "Sign in" : "Loading"}</span>
              </Link>
            )}
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
              href="/question-bank"
            >
              <span>Get Started</span>
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>

        <nav
          className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 md:absolute md:left-1/2 md:top-5 md:mx-0 md:-translate-x-1/2 md:overflow-visible md:pb-0"
          aria-label="Main navigation"
        >
          {navItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={[
                  "relative shrink-0 rounded-xl px-3 py-2 text-sm font-bold transition",
                  isActive
                    ? "text-blue-600 after:absolute after:inset-x-3 after:-bottom-2 after:h-0.5 after:rounded-full after:bg-blue-600"
                    : "text-slate-900 hover:bg-blue-50 hover:text-blue-600"
                ].join(" ")}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
