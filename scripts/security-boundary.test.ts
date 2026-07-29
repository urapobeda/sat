import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const satTypes = readFileSync("types/sat.ts", "utf8");
const publicQuestionBlock = satTypes.match(/export type Question = \{[\s\S]*?\};/)?.[0] ?? "";

assert.ok(publicQuestionBlock, "Public Question type should exist");
assert.equal(
  publicQuestionBlock.includes("correctAnswer"),
  false,
  "Public Question type must not expose correctAnswer"
);
assert.equal(
  publicQuestionBlock.includes("explanation"),
  false,
  "Public Question type must not expose explanation"
);

const queries = readFileSync("lib/supabase/queries.ts", "utf8");

assert.equal(
  /from\("questions"\)\s*\.select\("\*"\)/.test(queries),
  false,
  "Public question queries must not use select(\"*\")"
);
assert.equal(
  queries.includes("correctAnswer: row.correct_answer"),
  false,
  "Public question mapper must not map correct_answer into client questions"
);

const aiTutorTypes = readFileSync("lib/aiTutor.ts", "utf8");
const tutorRequestBlock =
  aiTutorTypes.match(/export type AITutorRequest = \{[\s\S]*?\};/)?.[0] ?? "";

assert.equal(
  tutorRequestBlock.includes("correctAnswer"),
  false,
  "AI Tutor client request must not include correctAnswer"
);
assert.equal(
  tutorRequestBlock.includes("explanation"),
  false,
  "AI Tutor client request must not include explanation"
);

console.log("security-boundary tests passed");
