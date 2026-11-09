import { getQuestionSubtopic } from "./questionBankStructure.ts";
import { normalizeTopic } from "./questions.ts";
import type { QuestionDifficulty, QuestionSummary, SectionFilter } from "@/types/sat";

export const QUESTION_DIFFICULTIES: QuestionDifficulty[] = ["easy", "medium", "hard"];

export function parseQuestionDifficulties(value: string | null): QuestionDifficulty[] {
  const requested = new Set((value ?? "").toLowerCase().split(",").map((part) => part.trim()));
  const selected = QUESTION_DIFFICULTIES.filter((difficulty) => requested.has(difficulty));
  return selected.length ? selected : [...QUESTION_DIFFICULTIES];
}

export function toggleQuestionDifficulty(selected: QuestionDifficulty[], difficulty: QuestionDifficulty | "all"): QuestionDifficulty[] {
  if (difficulty === "all") {
    return selected.length === QUESTION_DIFFICULTIES.length ? [] : [...QUESTION_DIFFICULTIES];
  }
  return QUESTION_DIFFICULTIES.filter((item) => item === difficulty ? !selected.includes(item) : selected.includes(item));
}

/** Shared by the setup counts, speculative preloading and the practice session. */
export function filterQuestionCatalog(catalog: QuestionSummary[], filters: {
  section: SectionFilter;
  difficulties: readonly QuestionDifficulty[];
  topics?: readonly string[];
  topic?: string | null;
}) {
  const matchingDifficulty = catalog.filter((question) =>
    (filters.section === "all" || question.section === filters.section) &&
    filters.difficulties.includes(question.difficulty));
  const legacyTopic = filters.topics?.length || !filters.topic ? null : normalizeTopic(filters.topic);
  if (legacyTopic) {
    const exact = matchingDifficulty.filter((question) => normalizeTopic(question.topic) === legacyTopic);
    if (exact.length) return exact;
  }
  const topics = new Set((filters.topics?.length ? filters.topics : legacyTopic ? [legacyTopic] : []).map(normalizeTopic));
  if (!topics.size) return matchingDifficulty;
  return matchingDifficulty.filter((question) =>
    topics.has(normalizeTopic(question.topic)) || topics.has(normalizeTopic(getQuestionSubtopic(question))));
}
