import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-600">404</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link className="hub-primary inline-flex" href="/">
            Go to dashboard
          </Link>
          <Link className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/question-bank">
            Question Bank
          </Link>
        </div>
      </div>
    </main>
  );
}
