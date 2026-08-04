import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const inputPath = process.argv[2] ?? "data/questions-import.json";
const outputPath = process.argv[3] ?? "supabase/generated-questions.sql";
const allowedSections = new Set(["math", "reading-writing"]);
const allowedDifficulties = new Set(["easy", "medium", "hard"]);
const allowedQuestionTypes = new Set([
  "multiple-choice",
  "student-produced-response"
]);

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
      sqlString(question.source_question_id ?? ""),
      sqlString(question.source_name ?? "question-bank-pdf"),
      sqlString(question.section),
      sqlString(question.category ?? ""),
      sqlString(question.topic),
      sqlString(question.difficulty),
      sqlString(question.question),
      `${sqlString(JSON.stringify(question.choices ?? []))}::jsonb`,
      `${sqlString(JSON.stringify(question.image_urls ?? []))}::jsonb`,
      sqlString(question.correct_answer),
      sqlString(question.explanation),
      question.is_bluebook === true ? "true" : "false",
      sqlString(getQuestionType(question)),
      Number.isInteger(question.source_page_start)
        ? String(question.source_page_start)
        : "null",
      Number.isInteger(question.source_page_end)
        ? String(question.source_page_end)
        : "null"
    ].join(", ")
  )
  .map((row) => `  (${row})`)
  .join(",\n");

const sql = `begin;

alter table public.questions
add column if not exists source_question_id text,
add column if not exists source_name text,
add column if not exists category text,
add column if not exists source_page_start integer,
add column if not exists source_page_end integer,
add column if not exists image_urls jsonb not null default '[]'::jsonb,
add column if not exists question_type text not null default 'multiple-choice'
  check (question_type in ('multiple-choice', 'student-produced-response'));

create table if not exists public.question_solutions (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_answer text not null,
  explanation text not null,
  solution_steps jsonb,
  scoring_metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop index if exists questions_source_question_id_key;

create unique index questions_source_question_id_key
on public.questions (source_question_id);

create temporary table import_questions (
  source_question_id text,
  source_name text,
  section text,
  category text,
  topic text,
  difficulty text,
  question text,
  choices jsonb,
  image_urls jsonb,
  correct_answer text,
  explanation text,
  is_bluebook boolean,
  question_type text,
  source_page_start integer,
  source_page_end integer
) on commit drop;

insert into import_questions (
  source_question_id,
  source_name,
  section,
  category,
  topic,
  difficulty,
  question,
  choices,
  image_urls,
  correct_answer,
  explanation,
  is_bluebook,
  question_type,
  source_page_start,
  source_page_end
)
values
${rows};

insert into public.questions (
  source_question_id,
  source_name,
  section,
  category,
  topic,
  difficulty,
  question,
  choices,
  image_urls,
  is_bluebook,
  question_type,
  source_page_start,
  source_page_end
)
select
  nullif(source_question_id, ''),
  source_name,
  section,
  nullif(category, ''),
  topic,
  difficulty,
  question,
  choices,
  image_urls,
  is_bluebook,
  question_type,
  source_page_start,
  source_page_end
from import_questions
on conflict (source_question_id) where source_question_id is not null do update
set
  source_name = excluded.source_name,
  section = excluded.section,
  category = excluded.category,
  topic = excluded.topic,
  difficulty = excluded.difficulty,
  question = excluded.question,
  choices = excluded.choices,
  image_urls = excluded.image_urls,
  is_bluebook = excluded.is_bluebook,
  question_type = excluded.question_type,
  source_page_start = excluded.source_page_start,
  source_page_end = excluded.source_page_end;

insert into public.question_solutions (
  question_id,
  correct_answer,
  explanation
)
select
  q.id,
  i.correct_answer,
  i.explanation
from import_questions i
join public.questions q
  on q.source_question_id = nullif(i.source_question_id, '')
on conflict (question_id) do update
set
  correct_answer = excluded.correct_answer,
  explanation = excluded.explanation,
  updated_at = now();

commit;
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

  if (
    "is_bluebook" in question &&
    typeof question.is_bluebook !== "boolean"
  ) {
    throw new Error(`${label}: is_bluebook must be true or false when provided.`);
  }

  const questionType = getQuestionType(question);
  if (!allowedQuestionTypes.has(questionType)) {
    throw new Error(
      `${label}: question_type must be "multiple-choice" or "student-produced-response".`
    );
  }

  ["topic", "question", "correct_answer", "explanation"].forEach((field) => {
    if (typeof question[field] !== "string" || question[field].trim().length === 0) {
      throw new Error(`${label}: ${field} is required.`);
    }
  });

  if (typeof question.source_question_id !== "string" || question.source_question_id.trim().length === 0) {
    throw new Error(`${label}: source_question_id is required for PDF imports.`);
  }

  if (!Array.isArray(question.choices)) {
    throw new Error(`${label}: choices must be an array.`);
  }

  if (questionType === "multiple-choice" && question.choices.length < 2) {
    throw new Error(`${label}: multiple-choice questions need at least 2 choices.`);
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

function getQuestionType(question) {
  if (question.question_type) {
    return question.question_type;
  }

  return Array.isArray(question.choices) && question.choices.length > 0
    ? "multiple-choice"
    : "student-produced-response";
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
