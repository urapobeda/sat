"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

/**
 * Lets a student select text and mark it with a color, like the highlighter in Bluebook.
 *
 * Uses the CSS Custom Highlight API, so the page's DOM (including KaTeX formulas)
 * is never modified. Highlights are remembered per `storageKey` for the browser
 * session, so they are still there when the student goes back to a question.
 * Browsers without the API simply show the text without the tool.
 */
export const HIGHLIGHT_COLORS = [
  { id: "yellow", label: "Yellow" },
  { id: "green", label: "Green" },
  { id: "blue", label: "Blue" },
  { id: "pink", label: "Pink" }
] as const;

export type ColorId = (typeof HIGHLIGHT_COLORS)[number]["id"];
export type HighlightTool = ColorId | "erase";
type SavedMark = { color: ColorId; end: number; start: number };
type LiveMark = { color: ColorId; range: Range };

const savedMarks = new Map<string, SavedMark[]>();

type HighlightableProps = {
  children: ReactNode;
  className?: string;
  enabled?: boolean;
  tool?: HighlightTool;
  storageKey: string;
};

export function Highlightable({ children, className, enabled = false, tool = "yellow", storageKey }: HighlightableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const marksRef = useRef<LiveMark[]>([]);
  const activeRef = useRef({ enabled, tool });
  useEffect(() => { activeRef.current = { enabled, tool }; }, [enabled, tool]);

  const addedRef = useRef<Set<Range>>(new Set());

  const sync = useCallback(() => {
    if (!supportsHighlights()) return;
    for (const color of HIGHLIGHT_COLORS) {
      const name = `sat-hl-${color.id}`;
      const highlight = CSS.highlights.get(name) ?? new Highlight();
      CSS.highlights.set(name, highlight);
      // drop the ranges this instance added before, then add the current ones
      for (const range of addedRef.current) highlight.delete(range);
      for (const mark of marksRef.current) {
        if (mark.color === color.id) highlight.add(mark.range);
      }
    }
    addedRef.current = new Set(marksRef.current.map((mark) => mark.range));
  }, []);

  const save = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    savedMarks.set(
      storageKey,
      marksRef.current.map((mark) => ({ color: mark.color, ...toOffsets(container, mark.range) }))
    );
  }, [storageKey]);

  // restore saved highlights once the content (KaTeX included) is in the DOM
  useEffect(() => {
    const isSupported = supportsHighlights();
    const container = containerRef.current;
    if (!isSupported || !container) return;

    marksRef.current = (savedMarks.get(storageKey) ?? [])
      .map((mark) => {
        const range = fromOffsets(container, mark.start, mark.end);
        return range ? { color: mark.color, range } : null;
      })
      .filter((mark): mark is LiveMark => mark !== null);
    sync();

    return () => {
      marksRef.current = [];
      sync();
    };
  }, [storageKey, sync]);

  function handlePointerUp() {
    if (!enabled || !supportsHighlights()) return;
    // let the browser finish updating the selection
    window.setTimeout(() => {
      const container = containerRef.current;
      const selection = window.getSelection();
      if (!activeRef.current.enabled || !container?.isConnected || !selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!rangeInside(range, container)) return;

      if (!range.collapsed && rangeInside(range, container)) {
        apply(range.cloneRange());
        return;
      }

      // A tap on an existing mark recolors or removes it with the active tool.
      const hit = range.collapsed
        ? marksRef.current.find((mark) => mark.range.isPointInRange(range.startContainer, range.startOffset))
        : undefined;
      if (hit) {
        apply(hit.range);
      }
    }, 0);
  }

  function apply(target: Range) {
    const color = activeRef.current.tool;
    const existing = marksRef.current.find((mark) => mark.range === target);

    if (color === "erase") {
      removeOverlapping(target);
    } else if (existing) {
      existing.color = color;
    } else {
      removeOverlapping(target);
      marksRef.current.push({ color, range: target });
    }

    finish();
  }

  function removeOverlapping(target: Range) {
    marksRef.current = marksRef.current.filter((mark) => !rangesOverlap(mark.range, target));
  }

  function finish() {
    sync();
    save();
    window.getSelection()?.removeAllRanges();
  }

  return (
    <div className={[className, enabled ? "cursor-text" : ""].filter(Boolean).join(" ")} onKeyUp={handlePointerUp} onPointerUp={handlePointerUp} ref={containerRef}>
      {children}
    </div>
  );
}

function supportsHighlights() {
  return typeof window !== "undefined" && typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";
}

function rangeInside(range: Range, container: Node) {
  return container.contains(range.startContainer) && container.contains(range.endContainer);
}

function rangesOverlap(a: Range, b: Range) {
  return a.compareBoundaryPoints(Range.END_TO_START, b) < 0 && a.compareBoundaryPoints(Range.START_TO_END, b) > 0;
}

/** character offsets of a range inside the container's text, so it can be rebuilt later */
function toOffsets(container: Node, range: Range) {
  const before = document.createRange();
  before.selectNodeContents(container);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  return { end: start + range.toString().length, start };
}

function fromOffsets(container: Node, start: number, end: number) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let position = 0;
  let startSet = false;
  let node = walker.nextNode();

  while (node) {
    const length = node.textContent?.length ?? 0;
    if (!startSet && start <= position + length) {
      range.setStart(node, start - position);
      startSet = true;
    }
    if (startSet && end <= position + length) {
      range.setEnd(node, end - position);
      return range;
    }
    position += length;
    node = walker.nextNode();
  }

  return null;
}
