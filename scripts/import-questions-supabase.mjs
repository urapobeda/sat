import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { isDeepStrictEqual } from "node:util";
import { resolveQuestionInlineAssets } from "./question-inline-assets.mjs";

const positionalArgs = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const inputPath = positionalArgs[0] ?? "data/question-bank-import.generated.json";
const batchSize = Number(positionalArgs[1] ?? 100);
const dryRun = process.argv.includes("--dry-run");
const verifyOnly = process.argv.includes("--verify-only");
const bucketName = "question-assets";
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) throw new Error("Batch size must be an integer from 1 to 1000");
if (dryRun && verifyOnly) throw new Error("Choose --dry-run or --verify-only");
for (const flag of process.argv.slice(2).filter((arg) => arg.startsWith("--"))) {
  if (!["--dry-run", "--verify-only"].includes(flag)) throw new Error(`Unknown option: ${flag}`);
}

loadEnvLocal();

const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false
  }
});

const inputQuestions = JSON.parse(await readFile(inputPath, "utf8"));

if (!Array.isArray(inputQuestions) || inputQuestions.length === 0) {
  throw new Error("Import file must be a non-empty JSON array.");
}

// Validate the entire file and the remote columns before the first upload/upsert.
const sourceIds = new Set();
for (const question of inputQuestions) {
  if (!question.source_question_id || sourceIds.has(question.source_question_id)) throw new Error("Question source ids must be present and unique");
  sourceIds.add(question.source_question_id);
  if (!question.question?.trim() || !question.correct_answer?.trim() || !question.explanation?.trim()) throw new Error(`Missing text/answer/rationale for ${question.source_question_id}`);
  const choices = question.choices ?? [];
  const type = question.question_type ?? (choices.length ? "multiple-choice" : "student-produced-response");
  if (type === "multiple-choice" && choices.map((choice) => choice.label).join("") !== "ABCD") throw new Error(`Invalid choice labels for ${question.source_question_id}`);
  if (type === "student-produced-response" && choices.length) throw new Error(`Grid-in has choices: ${question.source_question_id}`);
  if (question.section === "math" && type === "multiple-choice" && !/^[A-D]$/.test(question.correct_answer)) throw new Error(`Math answer must be a letter: ${question.source_question_id}`);
  for (const choice of choices) {
    if (!choice.text?.trim() && !choice.image_file && !choice.image_url) throw new Error(`Empty choice ${choice.label} for ${question.source_question_id}`);
  }
  for (const file of [...(question.image_files ?? []), ...choices.map((choice) => choice.image_file).filter(Boolean), ...Object.values(question.inline_image_files ?? {})]) {
    if (!existsSync(file)) throw new Error(`Missing image: ${file}`);
  }
  const imageCount = question.image_files?.length || question.image_urls?.length || 0;
  for (const match of question.question.matchAll(/\[\[img:(\d+)\]\]/g)) {
    if (Number(match[1]) >= imageCount) throw new Error(`Missing stem image ${match[1]} for ${question.source_question_id}`);
  }
}
// Resolve before writes so uploads and read-back compare exactly the same URLs,
// and missing image tokens fail even in --dry-run (including inside tables).
const questions = inputQuestions.map((question) => resolveQuestionInlineAssets(question, (file) => publicFileUrl(question, file)));
for (const [table, columns] of [["questions", "id,source_question_id,question,choices,image_urls,question_type,category,source_name,source_page_start,source_page_end"], ["question_solutions", "question_id,correct_answer,explanation,scoring_metadata"]]) {
  const { error } = await supabase.from(table).select(columns).limit(0);
  if (error) throw new Error(`Preflight failed for ${table}: ${error.message}`);
}
console.log(`Preflight passed: ${questions.length} questions; stem figures: ${questions.filter((q) => q.image_files?.length || q.image_urls?.length).length}; choice figures: ${questions.filter((q) => q.choices?.some((c) => c.image_file || c.image_url)).length}; grid-in: ${questions.filter((q) => !(q.choices?.length)).length}; inline PNG files: ${questions.reduce((n, q) => n + Object.keys(q.inline_image_files ?? {}).length, 0)}`);
if (dryRun) {
  console.log("Dry run complete: no uploads or database changes.");
  process.exit(0);
}
if (!verifyOnly) await ensureAssetBucket();

let imported = 0;

for (let index = 0; index < questions.length; index += batchSize) {
  const batch = questions.slice(index, index + batchSize);
  if (verifyOnly) {
    await verifyBatch(batch);
    console.log(`Verified ${Math.min(index + batchSize, questions.length)}/${questions.length}`);
    continue;
  }
  const rows = [];

  for (const question of batch) {
    await uploadInlineImages(question);
    const imageUrls = await uploadQuestionImages(question);
    const choices = await uploadChoiceImages(question);
    rows.push(toQuestionRow({ ...question, choices }, imageUrls));
  }

  const { data: insertedQuestions, error: questionError } = await supabase
    .from("questions")
    .upsert(rows, { onConflict: "source_question_id" })
    .select("id,source_question_id");

  if (questionError) {
    if (/index row|questions_question_key/i.test(questionError.message)) {
      throw new Error(`Question import failed: ${questionError.message}. Apply supabase/migrations/fix_question_text_identity.sql in the Supabase SQL Editor, then rerun this import. Existing question IDs are retained.`);
    }
    throw new Error(`Question import failed: ${questionError.message}`);
  }

  const questionIdBySourceId = new Map(
    (insertedQuestions ?? []).map((question) => [
      question.source_question_id,
      question.id
    ])
  );
  const solutions = batch.map((question) => {
    const questionId = questionIdBySourceId.get(question.source_question_id);

    if (!questionId) {
      throw new Error(`Missing inserted id for ${question.source_question_id}.`);
    }

    return {
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      question_id: questionId,
      // e.g. { accepted_answers: ["3/17", ".1764"] } for student-produced responses
      scoring_metadata: question.scoring_metadata ?? null
    };
  });

  const { error: solutionError } = await supabase
    .from("question_solutions")
    .upsert(solutions, { onConflict: "question_id" });

  if (solutionError) {
    throw new Error(`Solution import failed: ${solutionError.message}`);
  }
  await verifyBatch(batch);

  imported += batch.length;
  console.log(`Imported ${imported}/${questions.length}`);
}

console.log(`Done. ${verifyOnly ? "Verified" : "Imported and verified"} ${questions.length} questions from ${inputPath}.`);

async function verifyBatch(batch) {
  const { data: rows, error } = await supabase.from("questions").select("*").in("source_question_id", batch.map((question) => question.source_question_id));
  if (error) throw new Error(`Read-back failed: ${error.message}`);
  const { data: solutions, error: solutionError } = await supabase.from("question_solutions").select("question_id,correct_answer,explanation,scoring_metadata").in("question_id", rows.map((row) => row.id));
  if (solutionError) throw new Error(`Solution read-back failed: ${solutionError.message}`);
  for (const question of batch) {
    const row = rows.find((row) => row.source_question_id === question.source_question_id);
    const solution = solutions.find((solution) => solution.question_id === row?.id);
    const choices = (question.choices ?? []).map(({ image_file, ...choice }) => image_file ? { ...choice, image_url: publicFileUrl(question, image_file) } : choice);
    const imageUrls = question.image_files?.length ? question.image_files.map((file) => publicFileUrl(question, file)) : question.image_urls ?? [];
    const expected = toQuestionRow({ ...question, choices }, imageUrls);
    if (!row || Object.entries(expected).some(([key, value]) => !isDeepStrictEqual(row[key], value)) || !solution || solution.correct_answer !== question.correct_answer || solution.explanation !== question.explanation || !isDeepStrictEqual(solution.scoring_metadata, question.scoring_metadata ?? null)) throw new Error(`Read-back mismatch for ${question.source_question_id}`);
  }
}

function publicFileUrl(question, filePath) {
  return supabase.storage.from(bucketName).getPublicUrl(`questions/${question.source_question_id}/${path.basename(filePath)}`).data.publicUrl;
}

async function ensureAssetBucket() {
  const { data } = await supabase.storage.getBucket(bucketName);

  if (data) {
    return;
  }

  const { error } = await supabase.storage.createBucket(bucketName, {
    allowedMimeTypes: ["image/png"],
    fileSizeLimit: "8MB",
    public: true
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`Could not create storage bucket: ${error.message}`);
  }
}

async function uploadQuestionImages(question) {
  if (!Array.isArray(question.image_files) || question.image_files.length === 0) {
    return question.image_urls ?? [];
  }

  const urls = [];

  for (const filePath of question.image_files) {
    urls.push(await uploadFile(question, filePath));
  }

  return urls;
}

// A choice can be a graph: { label, text, image_file } -> { label, text, image_url }
async function uploadChoiceImages(question) {
  const choices = [];

  for (const choice of question.choices ?? []) {
    const { image_file: imageFile, ...rest } = choice;
    choices.push(imageFile ? { ...rest, image_url: await uploadFile(question, imageFile) } : rest);
  }

  return choices;
}

async function uploadFile(question, filePath) {
  const normalizedFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  const buffer = await readFile(normalizedFilePath);
  const storagePath = `questions/${question.source_question_id}/${path.basename(filePath)}`;
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, buffer, {
      contentType: "image/png",
      upsert: true
    });

  if (error) {
    throw new Error(`Image upload failed for ${filePath}: ${error.message}`);
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(bucketName).getPublicUrl(storagePath);

  return publicUrl;
}

async function uploadInlineImages(question) {
  const files = [...new Set(Object.values(question.inline_image_files ?? {}))];
  // Small formulas are independent uploads; keep bounded parallelism.
  for (let i = 0; i < files.length; i += 4) {
    await Promise.all(files.slice(i, i + 4).map((file) => uploadFile(question, file)));
  }
}

function toQuestionRow(question, imageUrls) {
  return {
    category: question.category || null,
    choices: question.choices ?? [],
    difficulty: question.difficulty,
    image_urls: imageUrls,
    is_bluebook: question.is_bluebook === true,
    question: question.question,
    question_type:
      question.question_type ??
      ((question.choices ?? []).length > 0
        ? "multiple-choice"
        : "student-produced-response"),
    section: question.section,
    source_name: question.source_name ?? "question-bank-pdf",
    source_page_end: question.source_page_end ?? null,
    source_page_start: question.source_page_start ?? null,
    source_question_id: question.source_question_id,
    topic: question.topic
  };
}

function normalizeSupabaseUrl(value) {
  return value
    ?.trim()
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/auth\/v1\/?$/i, "")
    .replace(/\/storage\/v1\/?$/i, "")
    .replace(/\/+$/g, "");
}

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");

  try {
    const content = readFileSync(envPath, "utf8");
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .forEach((line) => {
        const [key, ...valueParts] = line.split("=");
        const value = valueParts.join("=").replace(/^['"]|['"]$/g, "");
        process.env[key] ??= value;
      });
  } catch {
    // The script also works when variables are already exported by the shell.
  }
}
