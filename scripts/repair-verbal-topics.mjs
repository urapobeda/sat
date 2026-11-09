/** Restore only verified verbal metadata. Default is a dry run; --apply writes it. */
import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { QUESTION_BANK_CATEGORIES } from "../lib/questionBankStructure.ts";

try { process.loadEnvFile(".env.local"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const apply = process.argv.includes("--apply");
const syncDifficulty = process.argv.includes("--sync-difficulty");
const directory = "data/verbal";
await mkdir(directory, { recursive: true });
const metadataFile = `${directory}/official-metadata.json`;
if (!existsSync(metadataFile) || process.argv.includes("--refresh")) {
  const response = await fetch("https://study.flashsat.net/api/cb-questions", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asmtEventId: 99, test: 1, domain: "INI,CAS,EOI,SEC" }), signal: AbortSignal.timeout(60000)
  });
  if (!response.ok) throw new Error(`Metadata HTTP ${response.status}`);
  await writeFile(metadataFile, JSON.stringify(await response.json(), null, 2));
}
const normalize = (value) => String(value ?? "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
const known = new Map(QUESTION_BANK_CATEGORIES.filter((c) => c.section === "reading-writing")
  .flatMap((c) => c.subtopics.map((s) => [normalize(s.title), { topic: s.title, category: c.title }])));
const metadata = JSON.parse(await readFile(metadataFile, "utf8"));
if (!Array.isArray(metadata) || !metadata.length) throw new Error("Invalid metadata index");
const official = new Map();
for (const row of metadata) {
  const skill = known.get(normalize(row.skill_desc));
  if (!skill || normalize(skill.category) !== normalize(row.primary_class_cd_desc) || official.has(row.questionId)) throw new Error(`Unrecognized or duplicate official metadata: ${row.questionId}`);
  const difficulty = { E: "easy", M: "medium", H: "hard" }[row.difficulty];
  if (!difficulty) throw new Error(`Unknown source difficulty: ${row.questionId}`);
  official.set(row.questionId, syncDifficulty ? { ...skill, difficulty } : skill);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/(rest|auth|storage)\/v1\/?$/i, "").replace(/\/+$/, "");
if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase URL and service key are required");
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function load() {
  const result = [];
  for (let from = 0;;) {
    const { data, error } = await supabase.from("questions")
      .select("id,source_question_id,topic,category,difficulty").eq("section", "reading-writing").order("id").range(from, from + 499);
    if (error) throw new Error(error.message);
    if (!data.length) return result;
    result.push(...data);
    from += data.length;
  }
}
const before = await load();
const changes = [];
const unmatched = [];
for (const row of before) {
  const skill = official.get(row.source_question_id);
  if (!skill) {
    const existing = known.get(normalize(row.topic));
    if (!existing || normalize(existing.category) !== normalize(row.category)) throw new Error(`Unresolved question: ${row.source_question_id}`);
    unmatched.push(row.source_question_id);
    continue; // Already classified, no fresh official match: leave it unchanged.
  }
  if (normalize(row.topic) === normalize(skill.topic) && normalize(row.category) === normalize(skill.category) && (!syncDifficulty || row.difficulty === skill.difficulty)) continue;
  changes.push({ ...row, after: skill });
}
const distribution = (rows) => rows.reduce((counts, row) => {
  const title = known.get(normalize(row.topic))?.topic ?? row.topic;
  counts[title] = (counts[title] ?? 0) + 1;
  return counts;
}, {});
const proposed = new Map(changes.map((q) => [q.id, q.after]));
const report = { questions: before.length, changes: changes.length, unmatched_preserved: unmatched,
  fields: { topic: changes.filter((q) => normalize(q.topic) !== normalize(q.after.topic)).length,
    category: changes.filter((q) => normalize(q.category) !== normalize(q.after.category)).length,
    difficulty: syncDifficulty ? changes.filter((q) => q.difficulty !== q.after.difficulty).length : 0 },
  before: distribution(before), after: distribution(before.map((q) => ({ ...q, ...proposed.get(q.id) }))), applied: false };
await writeFile(`${directory}/repair-plan.json`, JSON.stringify({ report, changes }, null, 2));
if (!apply) {
  console.log(JSON.stringify(report, null, 2));
  console.log("Dry run only. Use --apply to update verified topic/category fields.");
  process.exit(0);
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
await writeFile(`${directory}/before-topics-${stamp}.json`, JSON.stringify(before, null, 2), { flag: "wx" });
const groups = new Map();
for (const row of changes) {
  const key = JSON.stringify([row.topic, row.category, row.difficulty, row.after]);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}
for (const group of groups.values()) {
  for (let i = 0; i < group.length; i += 100) {
    const batch = group.slice(i, i + 100);
    let query = supabase.from("questions").update(group[0].after).eq("section", "reading-writing")
      .in("id", batch.map((q) => q.id)).eq("topic", group[0].topic).eq("difficulty", group[0].difficulty);
    query = group[0].category === null ? query.is("category", null) : query.eq("category", group[0].category);
    const { data, error } = await query.select("id,topic,category,difficulty");
    if (error || data.length !== batch.length) throw new Error(error?.message ?? "Metadata changed concurrently; rerun to review the remaining rows");
  }
}
const after = await load();
const afterById = new Map(after.map((q) => [q.id, q]));
if (after.length !== before.length || before.some((q) => afterById.get(q.id)?.source_question_id !== q.source_question_id)) throw new Error("Question identity mismatch");
for (const row of changes) {
  const saved = afterById.get(row.id);
  if (saved.topic !== row.after.topic || saved.category !== row.after.category || (syncDifficulty && saved.difficulty !== row.after.difficulty)) throw new Error(`Read-back mismatch: ${row.source_question_id}`);
}
const localFile = "data/wr-question-bank.generated.json";
if (existsSync(localFile)) {
  const local = JSON.parse(await readFile(localFile, "utf8"));
  const bySource = new Map(after.filter((q) => q.source_question_id).map((q) => [q.source_question_id, { topic: q.topic, category: q.category, difficulty: q.difficulty }]));
  await writeFile(`${directory}/before-local-${stamp}.json`, JSON.stringify(local, null, 2), { flag: "wx" });
  for (const row of local) Object.assign(row, bySource.get(row.source_question_id) ?? {});
  await writeFile(localFile, JSON.stringify(local, null, 2) + "\n");
}
report.applied = true;
report.after = distribution(after);
await writeFile(`${directory}/repair-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(`Verified: existing IDs retained; only ${syncDifficulty ? "topic/category/difficulty" : "topic/category"} metadata was updated.`);
