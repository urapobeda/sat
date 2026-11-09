import assert from "node:assert/strict";
import { filterQuestionCatalog, parseQuestionDifficulties, QUESTION_DIFFICULTIES, toggleQuestionDifficulty } from "../lib/questionBankFilters.ts";
import { getQuestionSubtopic } from "../lib/questionBankStructure.ts";
import type { QuestionSummary } from "../types/sat.ts";

let selected = toggleQuestionDifficulty(QUESTION_DIFFICULTIES, "hard");
assert.deepEqual(selected, ["hard"]);
selected = toggleQuestionDifficulty(selected, "medium");
assert.deepEqual(selected, ["medium", "hard"]);
assert.deepEqual(toggleQuestionDifficulty(selected, "medium"), ["hard"]);
assert.deepEqual(toggleQuestionDifficulty(selected, "easy"), QUESTION_DIFFICULTIES);
assert.deepEqual(toggleQuestionDifficulty(["hard"], "easy"), ["easy", "hard"]);
assert.deepEqual(toggleQuestionDifficulty(["hard"], "hard"), QUESTION_DIFFICULTIES);
assert.deepEqual(toggleQuestionDifficulty(selected, "all"), QUESTION_DIFFICULTIES);
assert.deepEqual(parseQuestionDifficulties("hard,medium,hard"), ["medium", "hard"]);
assert.deepEqual(parseQuestionDifficulties("hard, easy"), ["easy", "hard"]);
assert.deepEqual(parseQuestionDifficulties("medium"), ["medium"], "legacy single-difficulty links still work");
assert.deepEqual(parseQuestionDifficulties(null), QUESTION_DIFFICULTIES);
assert.deepEqual(parseQuestionDifficulties("invalid"), QUESTION_DIFFICULTIES);

const catalog: QuestionSummary[] = [
  { id: "vocab-e", section: "reading-writing", topic: "Words in Context", difficulty: "easy" },
  { id: "vocab-m", section: "reading-writing", topic: "Words in Context", difficulty: "medium" },
  { id: "vocab-h", section: "reading-writing", topic: "Words in Context", difficulty: "hard" },
  { id: "structure", section: "reading-writing", topic: "Text Structure and Purpose", difficulty: "medium" },
  { id: "boundaries", section: "reading-writing", topic: "Boundaries", difficulty: "hard" },
  { id: "form", section: "reading-writing", topic: "Form, Structure, and Sense", difficulty: "easy" },
  { id: "math", section: "math", topic: "Linear Functions", difficulty: "hard" }
];
assert.deepEqual(filterQuestionCatalog(catalog, { section: "reading-writing", difficulties: ["medium", "hard"], topics: ["words-in-context"] }).map((q) => q.id), ["vocab-m", "vocab-h"]);
assert.deepEqual(filterQuestionCatalog(catalog, { section: "reading-writing", difficulties: ["easy", "hard"], topics: ["words-in-context", "boundaries"] }).map((q) => q.id), ["vocab-e", "vocab-h", "boundaries"]);
assert.deepEqual(filterQuestionCatalog(catalog, { section: "reading-writing", difficulties: ["medium"], topic: "text-structure-and-purpose" }).map((q) => q.id), ["structure"]);
const withLegacyAlias: QuestionSummary[] = [...catalog, { id: "structure-alias", section: "reading-writing", topic: "Text Structure", difficulty: "medium" }];
assert.deepEqual(filterQuestionCatalog(withLegacyAlias, { section: "reading-writing", difficulties: ["medium"], topic: "text-structure-and-purpose" }).map((q) => q.id), ["structure"]);
assert.deepEqual(filterQuestionCatalog(withLegacyAlias, { section: "reading-writing", difficulties: ["medium"], topics: ["text-structure-and-purpose"] }).map((q) => q.id), ["structure", "structure-alias"]);

const subtopic = (topic: string) => getQuestionSubtopic({ section: "reading-writing", topic });
assert.equal(subtopic("Craft and Structure"), "Uncategorized", "a domain must not turn into vocabulary");
assert.equal(subtopic("Uncategorized"), "Uncategorized");
assert.equal(subtopic("Some future skill"), "Uncategorized");
assert.equal(subtopic("Text Structure and Purpose"), "Text Structure and Purpose");
assert.equal(subtopic("Form Structure and Sense"), "Form, Structure, and Sense");
assert.equal(subtopic("Vocabulary in Context"), "Words in Context");
const oldLabels = [...Array(259).fill("Words in Context"), ...Array(149).fill("Craft and Structure"), ...Array(417).fill("Uncategorized")];
assert.equal(oldLabels.filter((topic) => subtopic(topic) === "Words in Context").length, 259, "the reported 825 vocabulary regression never recurs");
console.log("question-bank-filters tests passed");
