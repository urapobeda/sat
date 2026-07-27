"use client";

import {
  ArrowRight,
  BookMarked,
  Calculator,
  ChevronDown,
  Flame,
  GraduationCap,
  Languages,
  Target,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured
} from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/question-bank", label: "Question Bank" },
  { href: "/tests", label: "Tests" },
  { href: "/study-plan", label: "Study Plan" },
  { href: "/progress", label: "Progress" }
];

const moreItems = [
  {
    href: "/question-rush",
    icon: Flame,
    isComingSoon: true,
    label: "Question Rush"
  },
  {
    href: "/vocabulary",
    icon: Languages,
    isComingSoon: true,
    label: "Vocabulary"
  },
  {
    href: "/mistakes",
    icon: BookMarked,
    isComingSoon: true,
    label: "Mistake Review"
  },
  {
    href: "/score-predictor",
    icon: Target,
    isComingSoon: true,
    label: "Score Predictor"
  },
  {
    href: "/tools/sat-score-calculator",
    icon: Calculator,
    label: "SAT Score Calculator"
  }
];

export function Navbar() {
  const pathname = usePathname();
  const supabaseConfigured = isSupabaseConfigured();
  const showComingSoon = process.env.NODE_ENV !== "production";
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(!supabaseConfigured);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const visibleMoreItems = moreItems.filter(
    (item) => !item.isComingSoon || showComingSoon
  );

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

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setIsMoreOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link className="flex min-w-0 items-center gap-3" href="/dashboard">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <GraduationCap size={24} />
            </span>
            <span className="truncate text-lg font-extrabold text-slate-950">
              <span className="text-blue-600">SAT</span> Practice Hub
            </span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <Link
                  className="inline-flex min-h-11 max-w-48 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 text-sm font-bold text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                  href="/progress"
                >
                  <UserRound size={17} />
                  <span className="truncate">Profile</span>
                </Link>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-100 bg-white px-4 text-sm font-bold text-rose-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50"
                  onClick={handleSignOut}
                  type="button"
                >
                  Logout
                </button>
              </>
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold !text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 [&_*]:!text-white"
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
              item.href === "/dashboard"
                ? pathname === "/" || pathname.startsWith("/dashboard")
                : pathname.startsWith(item.href);

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
          <div
            className="relative shrink-0"
            onMouseEnter={() => setIsMoreOpen(true)}
            onMouseLeave={() => setIsMoreOpen(false)}
            ref={moreMenuRef}
          >
            <button
              aria-expanded={isMoreOpen}
              className={[
                "relative inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold transition",
                visibleMoreItems.some((item) => pathname.startsWith(item.href))
                  ? "text-blue-600 after:absolute after:inset-x-3 after:-bottom-2 after:h-0.5 after:rounded-full after:bg-blue-600"
                  : "text-slate-900 hover:bg-blue-50 hover:text-blue-600"
              ].join(" ")}
              onClick={() => setIsMoreOpen((current) => !current)}
              type="button"
            >
              More
              <ChevronDown
                className={isMoreOpen ? "rotate-180 transition" : "transition"}
                size={15}
              />
            </button>

            <div
              className={[
                "absolute left-0 top-full z-50 w-72 pt-2 transition md:left-auto md:right-0",
                isMoreOpen
                  ? "visible translate-y-0 opacity-100"
                  : "invisible translate-y-1 opacity-0"
              ].join(" ")}
            >
              <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl shadow-blue-950/10">
              {visibleMoreItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 text-sm font-black text-slate-800 transition hover:bg-blue-50 hover:text-blue-700"
                    href={item.href}
                    key={item.href}
                    onClick={() => setIsMoreOpen(false)}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Icon size={17} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.isComingSoon ? (
                      <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-violet-700">
                        Soon
                      </span>
                    ) : null}
                  </Link>
                );
              })}
              </div>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
