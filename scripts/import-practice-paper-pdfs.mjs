import { createClient } from "@supabase/supabase-js";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { loadEnvFile } from "node:process";

const [directory, ...flags] = process.argv.slice(2);
const dryRun = flags.includes("--dry-run");
const publish = flags.includes("--publish");
if (!directory || flags.some((flag) => !["--dry-run", "--publish"].includes(flag))) {
  throw new Error("Usage: node scripts/import-practice-paper-pdfs.mjs DIRECTORY [--dry-run | --publish]");
}
if (dryRun && publish) throw new Error("Choose either --dry-run or --publish");

const papers = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8"));
if (!Array.isArray(papers) || papers.length === 0 || new Set(papers.map((paper) => paper.slug)).size !== papers.length) {
  throw new Error("Expected a nonempty manifest with unique paper slugs");
}
for (const paper of papers) {
  if (!/^pdf-[a-z0-9-]+$/.test(paper.slug) || !paper.modules.length ||
      paper.private_files.some((file) => !["answers.pdf", "answer-reference.pdf"].includes(file))) {
    throw new Error("Invalid paper manifest");
  }
  for (const file of ["questions.pdf", ...paper.private_files]) {
    if (!(await stat(join(directory, paper.slug, file))).size) throw new Error("Empty PDF: " + paper.slug);
  }
}
console.log(`Preflight passed: ${papers.length} papers and ${papers.reduce((sum, paper) => sum + paper.modules.length, 0)} modules`);
if (dryRun) process.exit(0);

try {
  loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRACTICE_PAPER_LICENSE_NOTES } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase URL or service-role key");
if (publish && !PRACTICE_PAPER_LICENSE_NOTES?.trim()) {
  throw new Error("Set PRACTICE_PAPER_LICENSE_NOTES to the publication permission covering the imported sources");
}

const client = createClient(NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "").replace(/\/rest\/v1$/, ""), SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const storage = client.storage.from("practice-papers");
function checked(result, context) {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data;
}

const bucket = checked(await client.storage.getBucket("practice-papers"), "Read practice-papers bucket");
if (bucket.public) throw new Error("The practice-papers bucket must be private");

for (const { slug, modules, private_files, ...paper } of papers) {
  const existing = checked(await client.from("exam_papers").select("id, is_published, source_name").eq("slug", slug).maybeSingle(), slug);
  if (existing && existing.source_name !== paper.source_name) throw new Error("Slug is in use: " + slug);
  const row = existing ?? checked(await client.from("exam_papers").insert({
    ...paper, slug, mode: "untimed-practice", difficulty: "standard",
    source_type: "licensed", is_published: false
  }).select("id, is_published").single(), slug);

  const stored = checked(await client.from("exam_modules").select("id, section, module_number, route_type, duration_seconds, question_count, sort_order").eq("paper_id", row.id), slug);
  for (const paperModule of modules) {
    const previous = stored.find((entry) => entry.section === paperModule.section && entry.module_number === paperModule.module_number && (entry.route_type ?? "base") === "base");
    if (previous) {
      if (Object.keys(paperModule).some((key) => previous[key] !== paperModule[key])) throw new Error("Module conflict: " + slug);
    } else {
      checked(await client.from("exam_modules").insert({ ...paperModule, paper_id: row.id, route_type: "base" }), slug);
    }
  }

  for (const file of ["questions.pdf", ...private_files]) {
    const bytes = await readFile(join(directory, slug, file));
    checked(await storage.upload(`${slug}/${file}`, bytes, { upsert: true, contentType: "application/pdf" }), slug + "/" + file);
  }
  if (publish && !row.is_published) {
    checked(await client.from("exam_papers").update({
      license_notes: PRACTICE_PAPER_LICENSE_NOTES.trim(), is_published: true
    }).eq("id", row.id), slug);
  }
  console.log(`${slug}: ${publish || row.is_published ? "published" : "staged"}`);
}

