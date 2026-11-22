"use client";
import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { lookupVocabulary, selectedVocabularyWord, vocabularyPosition } from "@/lib/vocabulary";
import { useVocabulary } from "@/components/vocabulary/VocabularyProvider";

type Selection = { word: string; signature: string; top: number; bottom: number; left: number; right: number };
const interactive = "button,a,input,textarea,select,[contenteditable=true],.katex";
export function VocabularySelection({ children, enabled, scopeKey }: { children: ReactNode; enabled: boolean; scopeKey: string }) {
  return <VocabularySelectionSurface key={`${scopeKey}-${enabled}`} enabled={enabled} scopeKey={scopeKey}>{children}</VocabularySelectionSurface>;
}
function VocabularySelectionSurface({ children, enabled, scopeKey }: { children: ReactNode; enabled: boolean; scopeKey: string }) {
  const vocabulary = useVocabulary();
  const available = Boolean(vocabulary);
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<(Selection & { scope: string }) | null>(null);
  const dismissed = useRef("");
  useEffect(() => {
    if (!available || !enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    function inspect() {
      const selected = window.getSelection();
      if (!selected || selected.isCollapsed || !selected.rangeCount) return;
      const range = selected.getRangeAt(0);
      if (!root.current?.contains(range.startContainer) || !root.current.contains(range.endContainer)) return;
      const element = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
      if (element?.closest(interactive)) return;
      const word = selectedVocabularyWord(selected.toString());
      if (!word) { setSelection(null); return; }
      const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
      const signature = `${scopeKey}:${word}:${rect.top}:${rect.left}`;
      if (signature === dismissed.current || !rect.width) return;
      setSelection({ word, signature, scope: scopeKey, top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
    }
    function schedule() { clearTimeout(timer); timer = setTimeout(inspect, 160); }
    function pointer(event: PointerEvent) {
      if (card.current?.contains(event.target as Node)) return;
      if (root.current?.contains(event.target as Node)) { dismissed.current = ""; return; }
      close();
    }
    function close() { clearTimeout(timer); setSelection(old => { if (old) dismissed.current = old.signature; return null; }); }
    function key(event: KeyboardEvent) { if (event.key === "Escape") close(); }
    function scroll(event: Event) { if (!card.current?.contains(event.target as Node)) close(); }
    document.addEventListener("selectionchange", schedule);
    document.addEventListener("pointerup", schedule);
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", close);
    return () => { clearTimeout(timer); document.removeEventListener("selectionchange", schedule); document.removeEventListener("pointerup", schedule); document.removeEventListener("pointerdown", pointer); document.removeEventListener("keydown", key); window.removeEventListener("scroll", scroll, true); window.removeEventListener("resize", close); };
  }, [available, enabled, scopeKey]);
  const visible = vocabulary && enabled && selection?.scope === scopeKey ? selection : null;
  const matches = visible && vocabulary ? lookupVocabulary(vocabulary.index, visible.word) : [];
  useLayoutEffect(() => {
    if (!visible || !card.current) return;
    const rect = card.current.getBoundingClientRect();
    const position = vocabularyPosition(visible, rect.width, rect.height, window.innerWidth, window.innerHeight);
    card.current.style.left = `${position.left}px`; card.current.style.top = `${position.top}px`;
  }, [visible, vocabulary?.status, vocabulary?.index]);
  return <><div ref={root}>{children}</div>{visible && vocabulary ? createPortal(
    <div ref={card} role="dialog" aria-label="Course vocabulary" className="fixed z-[80] max-h-[min(360px,calc(100dvh-24px))] w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 font-sans text-sm text-slate-900 shadow-xl" style={{ left: 12, top: 12 }}>
      <div className="flex items-start justify-between gap-3"><strong className="break-words text-base">{visible.word}</strong><button type="button" aria-label="Close vocabulary" className="-mr-2 -mt-2 flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg hover:bg-slate-100" onClick={() => { dismissed.current = visible.signature; setSelection(null); }}><X size={18} /></button></div>
      {vocabulary.status === "loading" ? <p role="status">Loading vocabulary…</p> : vocabulary.status === "guest" ? <p><Link href="/auth" className="text-blue-600 underline">Sign in</Link> to use the course vocabulary.</p> : vocabulary.status === "error" ? <p>Vocabulary could not be loaded. <button type="button" className="min-h-11 cursor-pointer text-blue-600 underline" onClick={vocabulary.retry}>Retry</button></p> : matches.length ? matches.map(word => <div key={word.id} className="space-y-2 border-t border-slate-100 py-3 first:pt-0">
        <p className="text-xs text-slate-500">{word.word}{word.part_of_speech ? ` · ${word.part_of_speech}` : ""} · {word.group_name ?? "Common vocabulary"}</p>
        <p className="whitespace-pre-wrap break-words">{word.definition_en}</p><p className="break-words text-slate-600" lang="ru">{word.translation_ru}</p>{word.example ? <p className="break-words italic text-slate-500">{word.example}</p> : null}
      </div>) : <p>Not in the course vocabulary yet.</p>}
    </div>, document.body) : null}</>;
}
