import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const inputPath = process.argv[2] ?? "data/questions-import.json";
const outputPath = process.argv[3] ?? "supabase/generated-questions.sql";
const allowedSections = new Set(["math", "reading-writing"]);
const allowedDifficulties = new Set(["easy", "medium", "hard"]);

const rawInput = await readFile(inputPath, "utf8").catch((error) => {
  throw new Error(`Could not read ${inputPath}: ${error.message}`);
});
const questions = JSON.parse(rawInput);

if (!Array.isArray(questions) || questions.length === 0) {
  throw new Error("Question import file must be a non-empty JSON array.");
}

questions.forEach(validateQuestion);

const rows = questions
  .map((question) =>
    [
      sqlString(question.section),
      sqlString(question.topic),
      sqlString(question.difficulty),
      sqlString(question.question),
      `${sqlString(JSON.stringify(question.choices))}::jsonb`,
      sqlString(question.correct_answer),
      sqlString(question.explanation)
    ].join(", ")
  )
  .map((row) => `  (${row})`)
  .join(",\n");

const sql = `insert into public.questions (
  section,
  topic,
  difficulty,
  question,
  choices,
  correct_answer,
  explanation
)
values
${rows}
on conflict (question) do update
set
  section = excluded.section,
  topic = excluded.topic,
  difficulty = excluded.difficulty,
  choices = excluded.choices,
  correct_answer = excluded.correct_answer,
  explanation = excluded.explanation;
`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, sql, "utf8");

console.log(`Generated ${outputPath} with ${questions.length} questions.`);

function validateQuestion(question, index) {
  const label = `Question ${index + 1}`;

  if (!allowedSections.has(question.section)) {
    throw new Error(`${label}: section must be "math" or "reading-writing".`);
  }

  if (!allowedDifficulties.has(question.difficulty)) {
    throw new Error(`${label}: difficulty must be "easy", "medium", or "hard".`);
  }

  ["topic", "question", "correct_answer", "explanation"].forEach((field) => {
    if (typeof question[field] !== "string" || question[field].trim().length === 0) {
      throw new Error(`${label}: ${field} is required.`);
    }
  });

  if (!Array.isArray(question.choices) || question.choices.length < 2) {
    throw new Error(`${label}: choices must contain at least 2 options.`);
  }

  question.choices.forEach((choice, choiceIndex) => {
    if (
      typeof choice !== "object" ||
      choice === null ||
      typeof choice.label !== "string" ||
      typeof choice.text !== "string" ||
      choice.text.trim().length === 0
    ) {
      throw new Error(`${label}: choice ${choiceIndex + 1} must have label and text.`);
    }
  });
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
