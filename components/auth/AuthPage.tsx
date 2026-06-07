"use client";

import { ArrowRight, GraduationCap, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Layout } from "@/components/Layout";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured
} from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/supabase/queries";

type AuthMode = "signin" | "signup";

export function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured()) {
      setError(
        "Supabase is not configured yet. Add your public URL and anon key to .env.local."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const authResult =
        mode === "signup"
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  full_name: fullName
                }
              }
            })
          : await supabase.auth.signInWithPassword({ email, password });

      if (authResult.error) {
        throw new Error(authResult.error.message);
      }

      if (authResult.data.user) {
        await ensureProfile(authResult.data.user);
      }

      if (mode === "signup" && !authResult.data.session) {
        setMessage("Check your email to confirm your account, then sign in.");
        return;
      }

      router.push("/question-bank");
      router.refresh();
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : "Authentication failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Layout>
      <section className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-stretch">
        <article className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-violet-50 p-7 shadow-soft sm:p-10">
          <div className="absolute right-8 top-8 hidden h-24 w-24 rounded-3xl bg-white/70 shadow-lg shadow-blue-900/10 lg:block" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
              <GraduationCap size={30} />
            </span>
            <h1 className="mt-7 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              Save your SAT progress across practice and tests.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              Sign in to store attempts, review weak areas, and keep your
              dashboard synced with Supabase.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                "Practice answers saved securely",
                "Mini test scores tracked over time",
                "Weak topics calculated from missed questions",
                "Progress dashboard updates automatically"
              ].map((item) => (
                <div
                  className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm font-bold text-slate-700 shadow-sm"
                  key={item}
                >
                  <ShieldCheck className="text-emerald-500" size={18} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex rounded-2xl bg-slate-100 p-1">
            {[
              { key: "signin" as const, label: "Sign in" },
              { key: "signup" as const, label: "Create account" }
            ].map((item) => (
              <button
                className={[
                  "min-h-11 flex-1 rounded-xl text-sm font-black transition",
                  mode === item.key
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                ].join(" ")}
                key={item.key}
                onClick={() => {
                  setMode(item.key);
                  setError(null);
                  setMessage(null);
                }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label className="block">
                <span className="text-sm font-black text-slate-700">Name</span>
                <input
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Alex Student"
                  type="text"
                  value={fullName}
                />
              </label>
            ) : null}

            <label className="block">
              <span className="text-sm font-black text-slate-700">Email</span>
              <div className="relative mt-2">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  autoComplete="email"
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="student@example.com"
                  required
                  type="email"
                  value={email}
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-black text-slate-700">Password</span>
              <input
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                required
                type="password"
                value={password}
              />
            </label>

            {error ? (
              <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                {error}
              </p>
            ) : null}

            {message ? (
              <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {message}
              </p>
            ) : null}

            <button
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
              {mode === "signin" ? "Sign in" : "Create account"}
              {!isSubmitting ? <ArrowRight size={18} /> : null}
            </button>
          </form>
        </article>
      </section>
    </Layout>
  );
}
