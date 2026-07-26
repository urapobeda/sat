import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { Layout } from "@/components/Layout";

type PaperStartRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PaperStartRoute({ params }: PaperStartRouteProps) {
  const { slug } = await params;

  return (
    <Layout>
      <Link
        className="inline-flex items-center gap-2 text-sm font-black text-blue-600 transition hover:text-blue-700"
        href={`/past-papers/${slug}`}
      >
        <ArrowLeft size={17} />
        Back to Paper Details
      </Link>

      <section className="mt-6 rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-white p-6 shadow-soft sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
          <FileText size={32} />
        </div>
        <div className="mx-auto mt-5 max-w-2xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.12em] text-blue-600">
            Paper Runner
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Past Paper runner is being connected to locked Test Mode
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            The paper library and details use real Supabase records now. The next
            implementation step is to reuse the existing test runner for paper
            modules, autosave, review filters, and adaptive routing without
            creating a second exam engine.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              href="/tests/start"
            >
              Start Current Test Mode
              <ArrowRight size={17} />
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              href={`/past-papers/${slug}`}
            >
              View Paper Details
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
