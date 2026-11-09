"use client";

import Link from "next/link";
import { BookOpen, NotebookPen } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeading } from "@/components/dashboard/PageHeading";
import { useStudentAccount } from "@/components/dashboard/StudentAccount";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { getQuestionSubtopic } from "@/lib/questionBankStructure";
import { formatSection } from "@/lib/questions";
import { getQuestionCatalog, getQuestionProgressLookup } from "@/lib/supabase/queries";
import type { QuestionSummary } from "@/types/sat";

type Group = { topic: string; section: QuestionSummary["section"]; count: number };

export function MistakeNotebookPage() {
  return <StudentShell active="mistakes"><Mistakes /></StudentShell>;
}

function Mistakes() {
  const { userId, isLoading } = useStudentAccount();
  const [result, setResult] = useState<{ userId: string; groups: Group[] | null } | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void Promise.all([getQuestionCatalog(), getQuestionProgressLookup(userId)]).then(([catalog, progress]) => {
      if (!active) return;
      const topics = new Map<string, Group>();
      for (const question of catalog) {
        if (!progress.incorrectIds.has(question.id)) continue;
        const topic = getQuestionSubtopic(question);
        const key = `${question.section}:${topic}`;
        const group = topics.get(key) ?? { topic, section: question.section, count: 0 };
        group.count++;
        topics.set(key, group);
      }
      setResult({ userId, groups: [...topics.values()].sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic)) });
    }).catch(() => {
      if (active) setResult({ userId, groups: null });
    });
    return () => { active = false; };
  }, [userId, retry]);

  const current = result?.userId === userId ? result : null;
  const loading = isLoading || Boolean(userId && !current);
  return (
    <main className="mx-auto max-w-5xl space-y-4">
      <PageHeading eyebrow="Targeted review" title="Mistake Notebook" description="Review questions from your saved attempts whose latest answer was incorrect." />
      {loading ? <p className="hub-card p-5 text-sm text-slate-600" role="status">Loading your mistakes…</p> : !userId ? (
        <section className="hub-card flex flex-col items-start gap-3 p-5">
          <span className="hub-icon"><NotebookPen size={18} aria-hidden="true" /></span>
          <h2 className="font-semibold text-slate-950">Make mistakes part of your practice</h2>
          <p className="text-sm text-slate-600">Sign in to see questions you missed across practice and tests.</p>
          <Link className="hub-primary" href="/auth">Sign in</Link>
        </section>
      ) : current?.groups === null ? (
        <p className="hub-card p-5 text-sm text-slate-600" role="status">Could not load saved mistakes. <button className="cursor-pointer underline" onClick={() => setRetry((value) => value + 1)} type="button">Retry</button></p>
      ) : current?.groups.length ? (
        <section className="hub-card p-5">
          <h2 className="hub-section-title">Missed by skill</h2>
          <ul className="mt-2 divide-y divide-slate-200">
            {current.groups.map(({ section, topic, count }) => (
              <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={`${section}:${topic}`}>
                <div><p className="font-semibold text-slate-950">{topic}</p><p className="text-sm text-slate-600">{formatSection(section)} · {count} to review</p></div>
                <Link className="hub-primary" href={`/question-bank/practice?${new URLSearchParams({ section, topics: topic, review: "missed" })}`}>Review {count}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="hub-card p-5">
          <span className="hub-icon"><BookOpen size={18} aria-hidden="true" /></span>
          <h2 className="mt-3 font-semibold text-slate-950">No missed questions to review</h2>
          <Link className="hub-primary mt-3" href="/question-bank">Open Question Bank</Link>
        </section>
      )}
    </main>
  );
}
