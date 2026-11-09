"use client";

import { ChevronLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { BearIcon } from "@/components/dashboard/BearIcon";
import { getSupabaseBrowserClient, isSupabaseConfigured, normalizeSupabaseUrl } from "@/lib/supabase/client";
import { getAuthRedirectAction } from "@/lib/authRedirect";
import { ensureProfile } from "@/lib/supabase/queries";

type AuthMode = "signin" | "signup" | "forgot" | "reset" | "callback";
const inputClass = "min-h-12 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-sm text-white outline-none placeholder:text-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40";
const titles: Record<AuthMode, string> = {
  signin: "Log in to your account",
  signup: "Create your account",
  forgot: "Forgot your password?",
  reset: "Choose a new password",
  callback: "Signing you in…"
};
const descriptions: Record<AuthMode, string> = {
  signin: "Welcome back! Please enter your details.",
  signup: "Start saving your SAT practice and progress.",
  forgot: "Enter your email to receive a password reset link.",
  reset: "Enter a new password for your SAT Hub account.",
  callback: "Finishing your connection to SAT Hub."
};

export function AuthPage({ initialMode = "signin" }: { initialMode?: AuthMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [canReset, setCanReset] = useState(false);

  useEffect(() => {
    if (initialMode !== "callback" && initialMode !== "reset") return;
    if (!isSupabaseConfigured()) return;
    let active = true;
    let callbackStarted = false;
    let recoveryReceived = false;
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.slice(1));
    const redirectError = url.searchParams.get("error_description") ?? fragment.get("error_description");
    const hasCallbackPayload = url.searchParams.has("code") || fragment.has("access_token");
    const supabase = getSupabaseBrowserClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const action = getAuthRedirectAction({
        mode: initialMode, event, hasSession: Boolean(session), hasCallbackPayload, redirectError
      });
      if (action === "recover") {
        recoveryReceived = true;
        setCanReset(true);
        setError(null);
        return;
      }
      if (action === "invalid" && !recoveryReceived && !callbackStarted) {
        setError(redirectError || (initialMode === "reset"
          ? "Open the password reset link from your email."
          : "The sign-in link is invalid or has expired."));
      }
      if (action !== "sign-in" || !session || callbackStarted) return;
      callbackStarted = true;
      setError(null);
      // Profile requests must run outside the Supabase auth listener.
      window.setTimeout(() => {
        if (!active) return;
        void ensureProfile(session.user).then(() => {
          if (active) router.replace("/question-bank");
        }).catch(() => {
          if (active) setError("Signed in, but the profile could not be saved.");
        });
      }, 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [initialMode, router]);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setMessage(null);
    setPassword("");
    setShowPassword(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured.");
      return;
    }
    const name = fullName.trim();
    if (mode === "signup" && !name) {
      setError("Enter your name.");
      return;
    }
    if (mode === "reset" && !canReset) return;

    setPending(true);
    try {
      const { auth } = getSupabaseBrowserClient();
      if (mode === "forgot") {
        const result = await auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth?mode=reset` });
        if (result.error) throw result.error;
        setMessage("If an account exists for that email, you’ll receive a reset link.");
        return;
      }
      if (mode === "reset") {
        const result = await auth.updateUser({ password });
        if (result.error) throw result.error;
        router.replace("/question-bank");
        return;
      }
      const result = mode === "signup"
        ? await auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/auth?mode=callback` }
        })
        : await auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (!result.data.session) {
        setMessage("Check your email to confirm your account, then log in.");
        return;
      }
      await ensureProfile(result.data.session.user);
      router.replace("/question-bank");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Authentication failed.");
    } finally {
      setPending(false);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
      const settingsResponse = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "" }
      });
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json();
        if (settings.external?.google === false) {
          throw new Error("Google sign-in is not enabled yet. You can log in with email.");
        }
      }
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth?mode=callback` }
      });
      if (oauthError) throw oauthError;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Google sign-in is unavailable.");
      setPending(false);
    }
  }

  const credentials = mode === "signin" || mode === "signup";
  return (
    <main className="grid min-h-dvh bg-black text-white lg:grid-cols-2" style={{ colorScheme: "dark" }}>
      <section className="relative grid min-h-dvh place-items-center px-6 pb-12 pt-20 sm:px-10">
        <Link className="absolute left-6 top-6 flex items-center gap-1 text-sm !text-neutral-300 hover:!text-white sm:left-9" href="/dashboard">
          <ChevronLeft aria-hidden="true" size={17} /> SAT Hub
        </Link>
        <div className="w-full max-w-[25rem]">
          <h1 className="text-center text-[28px] font-semibold tracking-tight">{titles[mode]}</h1>
          <p className="mt-1 text-center text-sm text-neutral-400">{descriptions[mode]}</p>
          {credentials ? (
            <>
              <div className="mx-auto mt-7 flex w-fit gap-1 rounded-2xl bg-neutral-900 p-1" role="group" aria-label="Account action">
                {(["signup", "signin"] as const).map((option) => (
                  <button aria-pressed={mode === option} className="cursor-pointer rounded-xl px-4 py-2 text-sm text-neutral-300 aria-pressed:bg-blue-600 aria-pressed:text-white" disabled={pending} key={option} onClick={() => switchMode(option)} type="button">
                    {option === "signup" ? "Sign up" : "Log in"}
                  </button>
                ))}
              </div>
              <button className="mt-7 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-neutral-50 px-4 text-sm font-semibold text-neutral-950 hover:bg-neutral-200 disabled:opacity-50" disabled={pending} onClick={signInWithGoogle} type="button">
                <svg aria-hidden="true" viewBox="0 0 48 48" width="20" height="20">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.2 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.21 5.48-4.74 7.18l7.73 6C44.44 38.03 46.98 31.87 46.98 24.55Z"/>
                  <path fill="#FBBC05" d="M10.54 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.28-3.13.77-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.54 2.56 10.78Z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/>
                </svg>
                Continue with Google
              </button>
              <div className="my-5 flex items-center gap-3 text-xs text-neutral-400 before:h-px before:flex-1 before:bg-neutral-700 after:h-px after:flex-1 after:bg-neutral-700">or continue with email</div>
            </>
          ) : null}
          {mode !== "callback" ? (
            <form className={`space-y-3 ${credentials ? "" : "mt-7"}`} onSubmit={handleSubmit}>
              {mode === "signup" ? (
                <input aria-label="Name" autoComplete="name" className={inputClass} onChange={(event) => setFullName(event.target.value)} placeholder="Name" required value={fullName} />
              ) : null}
              {mode !== "reset" ? (
                <input aria-label="Email" autoComplete="email" className={inputClass} onChange={(event) => setEmail(event.target.value)} placeholder="Email" required type="email" value={email} />
              ) : null}
              {mode !== "forgot" ? (
                <div className="relative">
                  <input aria-label={mode === "reset" ? "New password" : "Password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} className={`${inputClass} pr-12`} minLength={mode === "signin" ? undefined : 6} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "reset" ? "New password" : "Password"} required type={showPassword ? "text" : "password"} value={password} />
                  <button aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-12 cursor-pointer place-items-center text-neutral-400 hover:text-white" onClick={() => setShowPassword(!showPassword)} type="button">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              ) : null}
              {mode === "signin" ? <button className="mx-auto block cursor-pointer py-1 text-sm text-neutral-400 hover:text-white" disabled={pending} onClick={() => switchMode("forgot")} type="button">Forgot password?</button> : null}
              <button className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50" disabled={pending || (mode === "reset" && !canReset)} type="submit">
                {pending ? <Loader2 className="animate-spin" size={17} /> : null}
                {{ signin: "Log in", signup: "Create account", forgot: "Send reset link", reset: "Update password" }[mode]}
              </button>
            </form>
          ) : null}
          {error ? <p className="mt-4 text-sm text-red-300" role="alert">{error}</p> : null}
          {message ? <p className="mt-4 text-sm text-emerald-300" role="status">{message}</p> : null}
          {!credentials ? <Link className="mt-5 block text-center text-sm !text-neutral-300 hover:!text-white" href="/auth" onClick={() => switchMode("signin")}>Back to log in</Link> : null}
        </div>
      </section>
      <aside className="m-7 ml-0 hidden place-items-center rounded-[2rem] bg-[radial-gradient(ellipse_at_top,#6383bc_0%,#2455b2_24%,#102a61_46%,#060c19_69%,#000_88%)] px-8 lg:grid">
        <div className="w-full max-w-xs text-center">
          <div className="mb-7 flex items-center justify-center gap-2 text-2xl font-semibold"><BearIcon size={29} /> SAT Hub</div>
          <h2 className="text-2xl font-semibold tracking-tight">Let’s build your SAT journey</h2>
          <p className="mt-3 text-sm text-neutral-300">Set up your account and keep your practice in one place.</p>
          <ol className="mt-6 space-y-3 text-left">
            {["Create your account", "Choose what to practice", "Track your progress"].map((step, index) => (
              <li className={`flex items-center gap-3 rounded-xl p-3 text-sm font-medium ${index === 0 ? "bg-neutral-50 text-neutral-950" : "bg-white/10 text-white"}`} key={step}>
                <span className={`grid size-7 place-items-center rounded-full text-xs ${index === 0 ? "bg-black text-white" : "bg-white/15"}`}>{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </main>
  );
}
