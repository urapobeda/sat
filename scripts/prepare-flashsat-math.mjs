import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import katex from "katex";
import sharp from "sharp";

const args = process.argv.slice(2);
const allowed = new Set(["--input", "--pdf-metadata", "--out-dir", "--limit"]);
for (let i = 0; i < args.length; i += 2) {
  if (!allowed.has(args[i]) || !args[i + 1] || args[i + 1].startsWith("--")) throw new Error(`Invalid option: ${args[i]}`);
}
const outDir = args.includes("--out-dir") ? args[args.indexOf("--out-dir") + 1] : "data/math/flashsat/prepared";
const converted = spawnSync("python", ["scripts/prepare-flashsat-math.py", ...args], { stdio: "inherit", env: { ...process.env, PYTHONUTF8: "1" } });
if (converted.error) throw converted.error;
if (converted.status !== 0) process.exit(converted.status ?? 1);
const readJson = async (name) => JSON.parse(await readFile(path.join(outDir, name), "utf8"));
const writeJson = async (name, value) => writeFile(path.join(outDir, name), JSON.stringify(value, null, 2) + "\n");
const pending = await readJson("pending.json");
const review = await readJson("math-review.json");
const counts = await readJson("conversion-stats.json");
const ready = [];
const texCache = new Set();
const pngCache = new Map();

for (const record of pending) {
  try {
    const texts = [record.question, record.explanation, ...record.choices.map((c) => c.text)];
    for (const text of texts) {
      for (const match of text.matchAll(/\[\[table:([A-Za-z0-9+/=]+)\]\]/g)) {
        const table = JSON.parse(Buffer.from(match[1], "base64").toString("utf8"));
        texts.push(table.caption, ...table.rows.flat().map((cell) => cell.text));
      }
      for (const match of text.matchAll(/\\\(([\s\S]*?)\\\)/g)) {
        if (texCache.has(match[1])) continue;
        katex.renderToString(match[1], { throwOnError: true, strict: "error", trust: false });
        texCache.add(match[1]);
      }
      for (const match of text.matchAll(/\[\[asset:(\d+):(\d+):([^\s\]]+)\]\]/g)) {
        const file = record.inline_image_files[match[3]];
        if (!file) throw new Error(`Missing inline PNG ${match[3]}`);
        const metadata = pngCache.get(file) ?? await sharp(file).metadata();
        pngCache.set(file, metadata);
        if (metadata.format !== "png" || metadata.width !== Number(match[1]) || metadata.height !== Number(match[2])) throw new Error("Embedded PNG dimensions mismatch");
      }
    }
    for (const file of [...record.image_files, ...record.choices.map((c) => c.image_file).filter(Boolean)]) {
      const svg = file.replace(/\.png$/, ".svg");
      await sharp(svg, { density: 144 }).flatten({ background: "#ffffff" }).png().toFile(file);
    }
    ready.push(record);
  } catch (error) {
    review.push({ source_question_id: record.source_question_id, problems: [error.message] });
  }
}
await writeJson("math-import.json", ready);
await writeJson("math-review.json", review);
const report = {
  processed: ready.length + review.length,
  ready: ready.length,
  review: review.length,
  multiple_choice: ready.filter((q) => q.choices.length).length,
  grid_in: ready.filter((q) => !q.choices.length).length,
  graph_in_stem: ready.filter((q) => q.image_files.length).length,
  graph_in_choices: ready.filter((q) => q.choices.some((c) => c.image_file)).length,
  ...counts,
  inline_png_files: ready.reduce((n, q) => n + Object.keys(q.inline_image_files).length, 0),
  unique_latex_validated: texCache.size,
  note: "Prepared locally; no database writes. Review file contains excluded questions."
};
await writeJson("report.json", report);
console.log(JSON.stringify(report, null, 2));
