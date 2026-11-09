"use client";

import { Eraser, Highlighter } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { HIGHLIGHT_COLORS, type HighlightTool } from "@/components/quiz/Highlightable";

const subscribeToHighlightSupport = () => () => {};
const getHighlightSupport = () => typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";
const getServerHighlightSupport = () => false;

export function useQuestionHighlight() {
  const [highlightEnabled, setHighlightEnabled] = useState(false);
  const [highlightTool, setHighlightTool] = useState<HighlightTool>("yellow");
  const highlightSupported = useSyncExternalStore(subscribeToHighlightSupport, getHighlightSupport, getServerHighlightSupport);

  useEffect(() => {
    if (!highlightEnabled) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHighlightEnabled(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [highlightEnabled]);

  return {
    highlightEnabled,
    highlightSupported,
    highlightTool,
    setHighlightTool,
    toggleHighlight: () => setHighlightEnabled((value) => !value)
  };
}

export function QuestionHighlightControls({
  compact = false,
  highlightEnabled,
  highlightSupported,
  highlightTool,
  setHighlightTool,
  toggleHighlight
}: ReturnType<typeof useQuestionHighlight> & { compact?: boolean }) {
  return (
    <div className={compact ? "relative" : "contents"}>
      <button
        aria-pressed={highlightEnabled}
        className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-2.5 text-sm font-medium transition disabled:opacity-50 sm:px-3 ${highlightEnabled ? "border-amber-400 bg-amber-100 text-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
        disabled={!highlightSupported}
        onClick={toggleHighlight}
        title={highlightSupported ? "Highlight selected text; Escape to turn off" : "Highlight is unavailable in this browser"}
        type="button"
      >
        <Highlighter aria-hidden="true" size={16} />
        <span className={compact ? "sr-only sm:not-sr-only" : undefined}>Highlight</span>
      </button>
      {highlightEnabled ? (
        <div aria-label="Highlight tools" className={`flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 ${compact ? "absolute right-0 top-full z-20 mt-1 shadow-md" : ""}`} role="group">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              aria-label={`Highlight ${color.label.toLowerCase()}`}
              aria-pressed={highlightTool === color.id}
              className={`highlight-swatch highlight-swatch-${color.id} h-8 w-8 rounded-md border border-black/10 ${highlightTool === color.id ? "ring-2 ring-slate-700 ring-offset-1" : ""}`}
              key={color.id}
              onClick={() => setHighlightTool(color.id)}
              title={color.label}
              type="button"
            />
          ))}
          <button
            aria-label="Remove highlight"
            aria-pressed={highlightTool === "erase"}
            className={`flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 ${highlightTool === "erase" ? "ring-2 ring-slate-700" : ""}`}
            onClick={() => setHighlightTool("erase")}
            title="Select or tap highlighted text to erase"
            type="button"
          >
            <Eraser aria-hidden="true" size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
