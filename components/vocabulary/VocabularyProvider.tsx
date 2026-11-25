"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useStudentAccount } from "@/components/dashboard/StudentAccount";
import { groupRequest } from "@/lib/groupApi";
import { createVocabularyPageLoader, vocabularyIndex, type VocabularyWord } from "@/lib/vocabulary";

type VocabularyState = { status: "loading" | "guest" | "ready" | "error"; index: Map<string, VocabularyWord[]>; retry: () => void };
export const VocabularyContext = createContext<VocabularyState | null>(null);
export const useVocabulary = () => useContext(VocabularyContext);
export function VocabularyProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const { userId, isLoading } = useStudentAccount();
  const loader = useMemo(() => createVocabularyPageLoader(() => {
    if (!userId) return Promise.reject(new Error("Sign in to use the course vocabulary."));
    return groupRequest<{ words: VocabularyWord[] }>("/api/vocabulary", "GET", undefined, AbortSignal.timeout(15000));
  }), [userId]);
  const [loaded, setLoaded] = useState<{ owner?: string; words: VocabularyWord[]; error?: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled || !userId || isLoading) return;
    let active = true;
    loader.load().then(data => { if (active) setLoaded({ owner: userId, words: data.words }); })
      .catch(() => { if (active) setLoaded({ owner: userId, words: [], error: true }); });
    return () => { active = false; };
  }, [enabled, userId, isLoading, loader, attempt]);
  const current = userId && loaded?.owner === userId ? loaded : null;
  const index = useMemo(() => vocabularyIndex(current?.words ?? []), [current]);
  const status = isLoading ? "loading" : !userId ? "guest" : !current ? "loading" : current.error ? "error" : "ready";
  return <VocabularyContext.Provider value={enabled ? { status, index, retry: () => { loader.retry(); setLoaded(null); setAttempt(a => a + 1); } } : null}>{children}</VocabularyContext.Provider>;
}
