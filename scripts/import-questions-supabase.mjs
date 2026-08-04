import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const inputPath = process.argv[2] ?? "data/question-bank-import.generated.json";
const batchSize = Number(process.argv[3] ?? 100);
const bucketName = "question-assets";

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

const questions = JSON.parse(await readFile(inputPath, "utf8"));

if (!Array.isArray(questions) || questions.length === 0) {
  throw new Error("Import file must be a non-empty JSON array.");
}

await ensureAssetBucket();

let imported = 0;

for (let index = 0; index < questions.length; index += batchSize) {
  const batch = questions.slice(index, index + batchSize);
  const rows = [];

  for (const question of batch) {
    const imageUrls = await uploadQuestionImages(question);
    rows.push(toQuestionRow(question, imageUrls));
  }

  const { data: insertedQuestions, error: questionError } = await supabase
    .from("questions")
    .upsert(rows, { onConflict: "source_question_id" })
    .select("id,source_question_id");

  if (questionError) {
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
      question_id: questionId
    };
  });

  const { error: solutionError } = await supabase
    .from("question_solutions")
    .upsert(solutions, { onConflict: "question_id" });

  if (solutionError) {
    throw new Error(`Solution import failed: ${solutionError.message}`);
  }

  imported += batch.length;
  console.log(`Imported ${imported}/${questions.length}`);
}

console.log(`Done. Imported ${questions.length} questions from ${inputPath}.`);

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

    urls.push(publicUrl);
  }

  return urls;
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
