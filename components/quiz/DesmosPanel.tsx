"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { loadDesmos, mountDesmos, type DesmosStateStore } from "@/lib/desmos";

export function DesmosPanel({ questionId, states, onClose }: {
  questionId: string;
  states: DesmosStateStore;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const node = dialog.current!;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    function show() {
      node.close();
      if (desktop.matches) node.show();
      else node.showModal();
      document.body.style.overflow = desktop.matches ? previousOverflow : "hidden";
    }
    show();
    desktop.addEventListener("change", show);
    return () => {
      desktop.removeEventListener("change", show);
      document.body.style.overflow = previousOverflow;
      node.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let mounted: ReturnType<typeof mountDesmos> | undefined;
    let observer: ResizeObserver | undefined;
    void loadDesmos().then((api) => {
      if (cancelled || !container.current) return;
      mounted = mountDesmos(api, container.current, states, questionId);
      observer = new ResizeObserver(() => mounted?.resize());
      observer.observe(container.current);
      setStatus("ready");
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => {
      cancelled = true;
      observer?.disconnect();
      mounted?.destroy();
    };
  }, [questionId, states, retry]);

  return (
    <dialog
      aria-labelledby={titleId}
      className="desmos-panel fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none flex-col border-0 bg-white p-0 text-slate-950 backdrop:bg-slate-950/40 lg:sticky lg:inset-auto lg:top-4 lg:h-[calc(100dvh-2rem)] lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      ref={dialog}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-2">
        <h2 className="font-semibold" id={titleId}>Калькулятор</h2>
        <button className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50" type="button" onClick={onClose}>
          <X aria-hidden="true" size={18} /> Закрыть
        </button>
      </header>
      {status === "loading" ? <p className="flex items-center gap-2 p-4 text-sm text-slate-600" role="status"><Loader2 className="animate-spin" size={18} /> Загружаем Desmos…</p> : null}
      {status === "error" ? <div className="p-4 text-sm" role="alert">
        <p>Не удалось загрузить калькулятор. Проверьте соединение.</p>
        <button className="hub-primary mt-3 min-h-11 cursor-pointer" type="button" onClick={() => { setStatus("loading"); setRetry((value) => value + 1); }}>Повторить</button>
      </div> : null}
      <div className="min-h-0 flex-1" ref={container} />
    </dialog>
  );
}
