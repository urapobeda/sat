/** Export publicly accessible Math question data without OCR or API keys.
 * Usage: node scripts/export-flashsat-math.mjs [--limit 5]
 * Raw HTML/MathML is preserved; this is not a Supabase import file.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const origin = "https://study.flashsat.net";
const directory = "data/math/flashsat";
const limitIndex = process.argv.indexOf("--limit");
const limit = limitIndex < 0 ? Infinity : Number(process.argv[limitIndex + 1]);
if (!(limit > 0)) throw new Error("Invalid --limit");
await mkdir(path.join(directory, "questions"), { recursive: true });
await mkdir(path.join(directory, "assets"), { recursive: true });

async function request(url, payload) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, {
      ...(payload ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}),
      signal: AbortSignal.timeout(60000)
    });
    if (response.ok) return response;
    if (response.status !== 429 && response.status < 500) throw new Error(`HTTP ${response.status}: ${url}`);
    if (attempt === 3) throw new Error(`HTTP ${response.status}: retry limit reached`);
    const seconds = Math.max(Number(response.headers.get("retry-after")) || 0, 10 * 2 ** attempt);
    console.log(`HTTP ${response.status}; waiting ${seconds}s`);
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }
}

const index = await (await request(`${origin}/api/cb-questions`, { asmtEventId: 99, test: 2, domain: "H,P,Q,S" })).json();
if (!Array.isArray(index) || !index.length || new Set(index.map((row) => row.questionId)).size !== index.length) throw new Error("Invalid question index");
await writeFile(path.join(directory, "index.json"), JSON.stringify(index, null, 2));
let completed = 0;
let cached = 0;
let stopped = false;
const failures = [];
const assetMap = existsSync(path.join(directory, "assets.json")) ? JSON.parse(await readFile(path.join(directory, "assets.json"), "utf8")) : {};

const queue = index.slice(0, limit);
let next = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
while (next < queue.length && !stopped) {
  const metadata = queue[next++];
  const filename = path.join(directory, "questions", `${metadata.questionId}.json`);
  try {
    if (existsSync(filename)) { cached++; completed++; continue; }
    const externalId = metadata.external_id || metadata.ibn;
    if (!externalId) throw new Error("Missing external id");
    const question = await (await request(`${origin}/api/cb-question`, { external_id: externalId })).json();
    if (typeof question.stem !== "string" || !question.stem.trim()) throw new Error("Empty question stem");
    const record = { source_url: `${origin}/question-bank/math`, fetched_at: new Date().toISOString(), metadata, question };
    await writeFile(filename, JSON.stringify(record, null, 2));
    completed++;
    if (completed % 25 === 0) console.log(`${completed}/${Math.min(limit, index.length)} (cache ${cached})`);
    await new Promise((resolve) => setTimeout(resolve, 300));
  } catch (error) {
    failures.push({ question_id: metadata.questionId, error: error.message });
    stopped = true;
    console.log(`Stopped at ${metadata.questionId}: ${error.message}`);
    break;
  }
}
}));

const records = [];
for (const metadata of index) {
  const filename = path.join(directory, "questions", `${metadata.questionId}.json`);
  if (existsSync(filename)) records.push(JSON.parse(await readFile(filename, "utf8")));
}
// Preserve remote source URLs and download actual image references from the content.
const urls = new Set();
function inspect(value) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/<(?:img|image)\b[^>]*?\b(?:src|href|xlink:href)\s*=\s*["']([^"']+)["']/gi)) {
      if (!match[1].startsWith("data:")) urls.add(new URL(match[1].replaceAll("&amp;", "&"), origin).href);
    }
  } else if (Array.isArray(value)) value.forEach(inspect);
  else if (value && typeof value === "object") Object.values(value).forEach(inspect);
}
records.forEach((record) => inspect(record.question));
for (const url of urls) {
  if (assetMap[url] && existsSync(assetMap[url])) continue;
  try {
    const response = await request(url);
    const mime = response.headers.get("content-type")?.split(";")[0];
    const ext = { "image/png": ".png", "image/jpeg": ".jpg", "image/svg+xml": ".svg", "image/webp": ".webp", "image/gif": ".gif" }[mime];
    if (!ext) throw new Error(`Unexpected image type ${mime}`);
    const filename = path.join(directory, "assets", createHash("sha256").update(url).digest("hex") + ext);
    await writeFile(filename, Buffer.from(await response.arrayBuffer()));
    assetMap[url] = filename.replaceAll("\\", "/");
    await writeFile(path.join(directory, "assets.json"), JSON.stringify(assetMap, null, 2));
    await new Promise((resolve) => setTimeout(resolve, 150));
  } catch (error) { failures.push({ asset_url: url, error: error.message }); }
}
await writeFile(path.join(directory, "math-raw.json"), JSON.stringify(records, null, 2));
const report = { fetched_at: new Date().toISOString(), indexed: index.length, saved: records.length, cached_this_run: cached, stopped, image_urls: urls.size, images_saved: Object.keys(assetMap).length, failures, format: "Original HTML and MathML, metadata, answer keys and rationale; not a Supabase import" };
await writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (stopped || failures.length) process.exitCode = 2;
