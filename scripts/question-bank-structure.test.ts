import assert from "node:assert/strict";
import {
  getCategoriesForSection,
  getCategoryForTopic,
  getQuestionCategory,
  getQuestionSubtopic,
  questionMatchesSubtopic
} from "../lib/questionBankStructure.ts";

type Section = "math" | "reading-writing";
const q = (section: Section, topic: string) => ({ section, topic });

// Every canonical title and alias resolves to its own subtopic and category.
for (const section of ["math", "reading-writing"] as const) {
  for (const category of getCategoriesForSection(section)) {
    for (const subtopic of category.subtopics) {
      for (const label of [subtopic.title, ...subtopic.aliases]) {
        assert.equal(getQuestionSubtopic(q(section, label)), subtopic.title, `${section}: ${label}`);
        assert.equal(getQuestionCategory(q(section, label)), category.title, `${section}: ${label} category`);
      }
    }
  }
}

// Normalization: case, "&" vs "and", and extra whitespace.
assert.equal(getQuestionSubtopic(q("math", "  linear   FUNCTIONS ")), "Linear Functions");
assert.equal(getQuestionSubtopic(q("reading-writing", "grammar & conventions")), "Boundaries");
assert.equal(getQuestionSubtopic(q("reading-writing", "Form, Structure and Sense")), "Form, Structure, and Sense", "verbal punctuation is ignored");

// The same topic string is resolved per section, and cached results never leak across sections.
assert.equal(getQuestionSubtopic(q("math", "Algebra")), "Linear Equations in One Variable");
assert.equal(getQuestionSubtopic(q("reading-writing", "Algebra")), "Uncategorized");
assert.equal(getQuestionSubtopic(q("math", "Algebra")), "Linear Equations in One Variable", "repeat lookup after other section");

// Keyword fallbacks for unknown topics still pick the right category.
assert.equal(getCategoryForTopic("math", "Nonlinear stuff").title, "Advanced Math");
assert.equal(getCategoryForTopic("math", "Statistics review").title, "Problem-Solving and Data Analysis");
assert.equal(getCategoryForTopic("math", "Circle theorems").title, "Geometry and Trigonometry");
assert.equal(getCategoryForTopic("math", "Something new").title, "Algebra");
assert.equal(getCategoryForTopic("reading-writing", "Punctuation conventions").title, "Standard English Conventions");
assert.equal(getCategoryForTopic("reading-writing", "Transitions practice").title, "Expression of Ideas");
assert.equal(getCategoryForTopic("reading-writing", "Inference drills").title, "Information and Ideas");
assert.equal(getCategoryForTopic("reading-writing", "Unknown").title, "Craft and Structure");

// An unknown math topic falls back to the first subtopic of its keyword category.
assert.equal(getQuestionSubtopic(q("math", "Probability puzzles")), "Ratios, Rates, Proportional Relationships, and Units");
assert.ok(questionMatchesSubtopic(q("math", "Circles"), "Circles"));
assert.ok(!questionMatchesSubtopic(q("math", "Circles"), "Linear Functions"));

// Repeated lookups return identical category objects (memoized, not recomputed).
assert.equal(getCategoryForTopic("math", "Circles"), getCategoryForTopic("math", "Circles"));

console.log("Question bank structure tests passed (aliases, normalization, per-section cache and keyword fallbacks)");
