import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { loadEnvFile } from "node:process";
import { isDeepStrictEqual } from "node:util";

const [directory, ...flags] = process.argv.slice(2);
if (!directory || flags.some((flag) => !["--dry-run", "--publish"].includes(flag))) {
  throw new Error("Usage: node scripts/import-interactive-papers.mjs DIRECTORY [--dry-run] [--publish]");
}
const dryRun = flags.includes("--dry-run");
const publish = flags.includes("--publish");
const papers = JSON.parse(await readFile(join(directory, "interactive-papers.json"), "utf8"));
if (!Array.isArray(papers) || !papers.length || new Set(papers.map((paper) => paper.slug)).size !== papers.length) throw new Error("Invalid paper list");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ids = new Set();
let questionCount = 0;
let imageCount = 0;
let imageBytes = 0;
for (const paper of papers) {
  if (!/^pdf-[a-z0-9-]+$/.test(paper.slug) || !paper.modules.length) throw new Error("Invalid paper slug or modules");
  const sections = new Set();
  for (const part of paper.modules) {
    if (!["math", "reading-writing"].includes(part.section) || ![1, 2].includes(part.module_number) ||
        part.items.length !== part.question_count || ![22, 27].includes(part.question_count)) throw new Error("Invalid module: " + paper.slug);
    const moduleKey = `${part.section}:${part.module_number}`;
    if (sections.has(moduleKey)) throw new Error("Duplicate module: " + paper.slug);
    sections.add(moduleKey);
    for (const [index, item] of part.items.entries()) {
      if (!uuid.test(item.id) || ids.has(item.id) || item.position !== index + 1 || !item.image_paths.length ||
          !item.accepted_answers.length || item.accepted_answers.some((answer) => !/^[A-D]$|^-?(?:\d*\.)?\d+(?:\/\d+)?$/.test(answer))) throw new Error("Invalid question or key: " + paper.slug);
      if (item.question_type === "multiple-choice" && item.accepted_answers.some((answer) => !/^[A-D]$/.test(answer))) throw new Error("Invalid multiple-choice key");
      ids.add(item.id);
      questionCount++;
      item.uploads = [];
      for (const filename of item.image_paths) {
        const location = resolve(directory, filename);
        if (!location.startsWith(resolve(directory) + sep) || !filename.endsWith(".webp")) throw new Error("Invalid image path");
        const bytes = await readFile(location);
        if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") throw new Error("Invalid WebP file");
        const hash = createHash("sha256").update(bytes).digest("hex");
        item.uploads.push({ filename, path: `${paper.slug}/${hash}.webp` });
        imageCount++;
        imageBytes += bytes.length;
      }
    }
  }
}
console.log(`Preflight passed: ${papers.length} papers; ${questionCount} questions with keys; ${imageCount} images; ${(imageBytes / 1024 / 1024).toFixed(1)} MB`);
if (dryRun) process.exit(0);
try { loadEnvFile(".env.local"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRACTICE_PAPER_LICENSE_NOTES } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase configuration missing");
const client = createClient(NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "").replace(/\/rest\/v1$/, ""), SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
function checked(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}
for (const table of ["paper_items", "paper_solutions", "paper_module_runs"]) checked(await client.from(table).select("*").limit(0), table);
const bucket = checked(await client.storage.getBucket("paper-question-images"), "Image bucket");
if (bucket.public) throw new Error("Question images bucket must be private");
let nextPaper = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
while (nextPaper < papers.length) {
  const paper = papers[nextPaper++];
  let row = checked(await client.from("exam_papers").select("*").eq("slug", paper.slug).maybeSingle(), paper.slug);
  if (!row) {
    row = checked(await client.from("exam_papers").insert({
      slug: paper.slug, title: paper.title, description: paper.description, year: paper.year,
      source_name: paper.source_name, source_type: "licensed", paper_type: paper.paper_type,
      mode: "linear", difficulty: "standard", is_published: false
    }).select("*").single(), paper.slug);
  }
  if (publish && !row.is_published && !(row.license_notes || PRACTICE_PAPER_LICENSE_NOTES?.trim())) throw new Error("Publication permission notes required for " + paper.slug);
  const storedModules = checked(await client.from("exam_modules").select("*").eq("paper_id", row.id), paper.slug);
  for (const { items, ...metadata } of paper.modules) {
    let entry = storedModules.find((part) => part.section === metadata.section && part.module_number === metadata.module_number && (part.route_type ?? "base") === "base");
    if (entry && Object.keys(metadata).some((key) => metadata[key] !== entry[key])) throw new Error("Module conflict: " + paper.slug);
    if (!entry) entry = checked(await client.from("exam_modules").insert({ ...metadata, paper_id: row.id, route_type: "base" }).select("*").single(), paper.slug);
    const existingItems = checked(await client.from("paper_items").select("*").eq("module_id", entry.id), paper.slug);
    const existingSolutions = existingItems.length ? checked(await client.from("paper_solutions").select("*").in("item_id", existingItems.map((item) => item.id)), paper.slug) : [];
    const newItems = [];
    const newSolutions = [];
    const uploads = [];
    for (const item of items) {
      const content = { id: item.id, module_id: entry.id, position: item.position, question_type: item.question_type, text: item.text, image_paths: item.uploads.map((image) => image.path) };
      const previous = existingItems.find((stored) => stored.id === item.id || stored.position === item.position);
      const solution = existingSolutions.find((stored) => stored.item_id === item.id);
      if (previous && !isDeepStrictEqual(previous, content)) throw new Error("Existing question differs: " + item.id);
      if (solution && !isDeepStrictEqual(solution.accepted_answers, item.accepted_answers)) throw new Error("Existing key differs: " + item.id);
      if (!previous) {
        uploads.push(...item.uploads);
        newItems.push(content);
      }
      if (!solution) newSolutions.push({ item_id: item.id, accepted_answers: item.accepted_answers });
    }
    let nextUpload = 0;
    await Promise.all(Array.from({ length: Math.min(6, uploads.length) }, async () => {
      while (nextUpload < uploads.length) {
        const upload = uploads[nextUpload++];
        const bytes = await readFile(join(directory, upload.filename));
        for (let attempt = 0; attempt < 5; attempt++) {
          const result = await client.storage.from("paper-question-images").upload(upload.path, bytes, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
          if (!result.error || ["Duplicate", "409"].includes(result.error.error ?? result.error.statusCode)) break;
          if (attempt === 4) checked(result, upload.filename);
          await new Promise((done) => setTimeout(done, 1000 * 2 ** attempt));
        }
      }
    }));
    if (newItems.length) checked(await client.from("paper_items").insert(newItems), paper.slug);
    if (newSolutions.length) checked(await client.from("paper_solutions").insert(newSolutions), paper.slug);
    const count = await client.from("paper_items").select("id", { count: "exact", head: true }).eq("module_id", entry.id);
    checked(count, paper.slug);
    if (count.count !== metadata.question_count) throw new Error("Question count mismatch: " + paper.slug);
  }
  checked(await client.from("exam_papers").update({
    mode: "linear", description: paper.description, source_name: paper.source_name,
    ...(publish ? { is_published: true, license_notes: row.license_notes || PRACTICE_PAPER_LICENSE_NOTES.trim() } : {})
  }).eq("id", row.id), paper.slug);
  console.log(`${paper.slug}: interactive questions imported${publish ? " and published" : ""}`);
}
}));
