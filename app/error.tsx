"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm" role="alert">
        <h1 className="text-2xl font-bold text-slate-950">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          An unexpected error occurred while loading this page. Please try again.
        </p>
        {digest ? <p className="mt-2 text-xs text-slate-500">Error ID: {digest}</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="hub-primary inline-flex cursor-pointer" onClick={() => retry()} type="button">
            Try again
          </button>
          <Link className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/">
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
