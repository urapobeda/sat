"use client";

import { useEffect, useMemo, useState } from "react";
import { getQuestionCatalog, getQuestionDetails } from "@/lib/supabase/queries";
import { getCategoriesForSection, getQuestionCategory, getQuestionSubtopic } from "@/lib/questionBankStructure";
import type { QuestionDifficulty, QuestionSummary, SatSection } from "@/types/sat";

const DIFFICULTIES: QuestionDifficulty[] = ["easy", "medium", "hard"];
const DIFFICULTY_LABEL: Record<QuestionDifficulty, string> = { easy: "Easy", hard: "Hard", medium: "Medium" };

export function QuestionPicker({ onChange, selectedIds }: { onChange: (ids: string[]) => void; selectedIds: string[] }) {
  const [catalog, setCatalog] = useState<QuestionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<SatSection>("math");
  const [category, setCategory] = useState("all");
  const [subtopics, setSubtopics] = useState<Set<string>>(new Set());
  const [difficulties, setDifficulties] = useState<Set<QuestionDifficulty>>(new Set(DIFFICULTIES));
  const [randomCount, setRandomCount] = useState(5);
  const [expanded, setExpanded] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    getQuestionCatalog()
      .then((data) => {
        if (active) {
          setCatalog(data);
          setLoading(false);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Could not load questions.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => getCategoriesForSection(section), [section]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const byId = useMemo(() => new Map(catalog.map((question) => [question.id, question])), [catalog]);

  const filtered = useMemo(
    () =>
      catalog.filter((question) => {
        if (question.section !== section) return false;
        if (!difficulties.has(question.difficulty)) return false;
        if (category !== "all" && getQuestionCategory(question) !== category) return false;
        if (subtopics.size > 0 && !subtopics.has(getQuestionSubtopic(question))) return false;
        return true;
      }),
    [catalog, section, difficulties, category, subtopics]
  );

  function toggleDifficulty(value: QuestionDifficulty) {
    setDifficulties((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next.size ? next : new Set(DIFFICULTIES);
    });
  }

  function toggleSubtopic(title: string) {
    setSubtopics((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  function toggleSelected(id: string) {
    onChange(selected.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  }

  function addRandom() {
    const pool = filtered.filter((question) => !selected.has(question.id)).map((question) => question.id);
    for (let index = pool.length - 1; index > 0; index--) {
      const target = Math.floor(Math.random() * (index + 1));
      [pool[index], pool[target]] = [pool[target], pool[index]];
    }
    onChange([...selectedIds, ...pool.slice(0, Math.max(0, randomCount))]);
  }

  async function togglePreview(id: string) {
    if (expanded[id] !== undefined) {
      setExpanded((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    setExpanded((current) => ({ ...current, [id]: "" }));
    try {
      const [question] = await getQuestionDetails([id]);
      setExpanded((current) => ({ ...current, [id]: question?.question ?? "Text unavailable." }));
    } catch {
      setExpanded((current) => ({ ...current, [id]: "Could not load the question text." }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="min-h-10 rounded-xl border border-slate-200 bg-transparent px-3 text-sm"
          onChange={(event) => {
            setSection(event.target.value as SatSection);
            setCategory("all");
            setSubtopics(new Set());
          }}
          value={section}
        >
          <option value="math">Math</option>
          <option value="reading-writing">Reading &amp; Writing</option>
        </select>
        <select
          className="min-h-10 rounded-xl border border-slate-200 bg-transparent px-3 text-sm"
          onChange={(event) => {
            setCategory(event.target.value);
            setSubtopics(new Set());
          }}
          value={category}
        >
          <option value="all">All topics</option>
          {categories.map((item) => (
            <option key={item.title} value={item.title}>
              {item.title}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((item) => (
            <label
              className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${
                difficulties.has(item) ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
              }`}
              key={item}
            >
              <input checked={difficulties.has(item)} className="sr-only" onChange={() => toggleDifficulty(item)} type="checkbox" />
              {DIFFICULTY_LABEL[item]}
            </label>
          ))}
        </div>
      </div>

      {category !== "all" ? (
        <div className="flex flex-wrap gap-2">
          {categories
            .find((item) => item.title === category)
            ?.subtopics.map((sub) => (
              <label
                className={`flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs ${
                  subtopics.has(sub.title) ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
                }`}
                key={sub.title}
              >
                <input checked={subtopics.has(sub.title)} className="sr-only" onChange={() => toggleSubtopic(sub.title)} type="checkbox" />
                {sub.title}
              </label>
            ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-600">
          Found: {filtered.length}, selected: {selectedIds.length}
        </span>
        <input
          className="min-h-9 w-20 rounded-xl border border-slate-200 bg-transparent px-2"
          max={50}
          min={1}
          onChange={(event) => setRandomCount(Number(event.target.value) || 1)}
          type="number"
          value={randomCount}
        />
        <button
          className="cursor-pointer rounded-xl border border-slate-200 px-3 py-1.5 font-semibold hover:bg-slate-50"
          onClick={addRandom}
          type="button"
        >
          Add random matching questions
        </button>
        {selectedIds.length > 0 ? (
          <button
            className="cursor-pointer rounded-xl border border-rose-200 px-3 py-1.5 font-semibold text-rose-600 hover:bg-rose-50"
            onClick={() => onChange([])}
            type="button"
          >
            Clear selection
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500" role="status">
          Loading questions…
        </p>
      ) : error ? (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : (
        <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
          {filtered.slice(0, 200).map((question) => (
            <div className="border-b border-slate-100 p-3 last:border-0" key={question.id}>
              <div className="flex items-start gap-3">
                <input checked={selected.has(question.id)} className="mt-1" onChange={() => toggleSelected(question.id)} type="checkbox" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{question.topic}</p>
                  <p className="text-xs text-slate-500">{DIFFICULTY_LABEL[question.difficulty]}</p>
                  {expanded[question.id] !== undefined ? (
                    <p className="mt-1 text-xs text-slate-600">{expanded[question.id] || "Loading…"}</p>
                  ) : null}
                </div>
                <button
                  className="cursor-pointer text-xs font-semibold text-blue-600 hover:underline"
                  onClick={() => togglePreview(question.id)}
                  type="button"
                >
                  {expanded[question.id] !== undefined ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          ))}
          {filtered.length > 200 ? (
            <p className="p-3 text-xs text-slate-500">Showing the first 200 of {filtered.length}. Narrow the filters.</p>
          ) : null}
          {filtered.length === 0 ? <p className="p-3 text-sm text-slate-500">No questions match these filters.</p> : null}
        </div>
      )}

      {selectedIds.length > 0 ? (
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-700">Selected questions ({selectedIds.length})</p>
          <ol className="max-h-56 space-y-1 overflow-y-auto text-sm">
            {selectedIds.map((id, index) => (
              <li className="flex items-center justify-between gap-2" key={id}>
                <span className="min-w-0 truncate">
                  {index + 1}. {byId.get(id)?.topic ?? id}
                </span>
                <button
                  className="shrink-0 cursor-pointer text-xs font-semibold text-rose-600 hover:underline"
                  onClick={() => onChange(selectedIds.filter((item) => item !== id))}
                  type="button"
                >
                  Remove
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
