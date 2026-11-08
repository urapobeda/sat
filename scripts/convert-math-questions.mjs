/**
 * Step 2 of the Math import: turn the cropped question pictures into text with LaTeX.
 *
 * Reads data/math/math-extract.json (from extract-math-questions.py), sends each
 * question's pictures to an OpenAI vision model, checks the answer the model read
 * against the "Correct Answer" printed in the PDF, and writes:
 *
 *   data/math/math-import.json   questions that passed the checks, ready for
 *                                npm run questions:import-supabase -- data/math/math-import.json
 *   data/math/math-review.json   questions that need a human look, with the reason
 *   data/math/ai/<id>.json       the raw model answer per question (cache: re-runs skip these)
 *
 * Usage:
 *   node scripts/convert-math-questions.mjs --limit 20          # try 20 questions first
 *   node scripts/convert-math-questions.mjs                     # everything
 *   node scripts/convert-math-questions.mjs --concurrency 6
 *   node scripts/convert-math-questions.mjs --only 3f5a3602,ac472881
 *
 * Needs OPENAI_API_KEY in .env.local. Model: --model, else OPENAI_VISION_MODEL,
 * else OPENAI_MODEL. Use a model that accepts images.
 */
import OpenAI from "openai";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import katex from "katex";

loadEnvLocal();

const args = parseArgs(process.argv.slice(2));
const dataDir = args.dir ?? "data/math";
const extractPath = path.join(dataDir, "math-extract.json");
const cacheDir = path.join(dataDir, "ai");
const provider = args.provider ?? "gemini";
const model = args.model || (provider === "gemini" ? process.env.GEMINI_MODEL || "gemini-3.1-flash-lite" : process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL);
const concurrency = Number(args.concurrency ?? 1);
const delayMs = Number(args["delay-ms"] ?? (provider === "gemini" ? 13000 : 0));
let nextRequest = 0;
let pacing = Promise.resolve();
let stopped = false;
let openai;
const usage = { input: 0, cached_input: 0, output: 0, requests: 0, cache_hits: 0 };

const INSTRUCTIONS = `You transcribe SAT Math questions from images into structured text. Do not solve, reword, shorten, or correct anything: copy the question, the answer choices and the rationale exactly as printed, only changing how math is written.

Math formatting:
- Write every mathematical expression in LaTeX: inline as \\( ... \\), stand-alone lines as \\[ ... \\]. Examples: \\(f(x) = 2(x-3)^2 + 5\\), \\(\\frac{3}{4}\\), \\(\\sqrt{2}\\), \\(x^{\\circ}\\), \\(\\overline{AB}\\), \\(\\angle ABC\\).
- A system of equations is one \\[ \\begin{aligned} ... \\\\ ... \\end{aligned} \\] block.
- Numbers, variables and coordinates that are printed in the math font go inside \\( \\) too: "Substituting \\(440\\) for \\(x\\)". Ordinary numbers in words (e.g. "3 hours", "in 2015") stay plain.
- Money stays plain text with a dollar sign, never LaTeX: "$125", "$3.50". Never use $...$ as math delimiters.
- Plain words stay plain text. Use Markdown only for tables and for *italic* words that are italic in the image.

Tables: write every table (in the question, a choice, or the rationale) as a Markdown pipe table, with LaTeX inside cells where needed. A table is never kept as a picture.

Figures: you get the whole question image plus separate crops labelled F1, F2, ... with where each crop was found ("stem" or choice "A"-"D"). For each crop decide:
- kind "graph" or "diagram" (coordinate grids, plots, geometric figures, number lines, histograms, scatterplots, bar charts): keep = true. In the stem, put the placeholder [[F1]] (with that crop's id) on its own line exactly where the figure appears. In a choice, set that choice's figure_id and leave text empty unless the choice also has words.
- kind "table": keep = false; write the table as Markdown instead.
- kind "formula" or "other" (a crop that is really just an equation, a system of equations, or text): keep = false; write it as LaTeX/text instead.
If a choice is a graph that was not given as a crop, describe nothing: set confidence "low" and explain in notes.
For each table crop, actually transcribe every cell into a Markdown pipe table in the corresponding stem or choice text. Set that choice's figure_id to null; do not leave table choices empty. For each graph in the stem, place its placeholder in the same order relative to the surrounding words as in the question image. A graph printed before the question text must appear before that text.
JSON escaping is critical: a JSON string must use two backslash characters for each LaTeX backslash. Never substitute a bare [ or ] for a math delimiter. Never use the JSON escape \\f for a mathematical variable f. Inspect all fields for accidentally escaped control characters before returning.
Classify every supplied crop exactly once. Keep only graphs and diagrams. Reference each kept crop exactly once in its original location; never reuse it in another choice. Do not invent crop ids. If any crop is incomplete, cuts off axis labels, or is assigned to the wrong location, set confidence "low" and explain. Put every stem placeholder on a separate line. Do not put figure placeholders in choice text or the rationale.

Fields:
- stem: the question text, including any lines above or below the figure.
- choices: for multiple-choice, exactly four items A, B, C, D in order. For a student-produced-response question (no choices), an empty list.
- correct_answer: the letter for multiple-choice; the main answer for student-produced-response, written the way a student would type it (e.g. 403, 3/17, .75, -2).
- accepted_answers: for student-produced-response, every answer form the image says is correct (the "Correct Answer" line and any "Note that ... are examples of ways to enter a correct answer"). Empty for multiple-choice.
- Do not infer extra accepted answers, solve the problem, or add decimal approximations absent from the printed rationale. If the printed answer is unreadable, set confidence "low" instead of guessing.
- explanation: the rationale, every paragraph, in order, separated by a blank line. Leave out the word "Rationale".
- confidence: "high" when everything was clearly readable; "medium" or "low" otherwise, and say why in notes.`;

const RESPONSE_FORMAT = {
  type: "json_schema",
  name: "sat_math_question",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["stem", "choices", "correct_answer", "accepted_answers", "explanation", "figures", "confidence", "notes"],
    properties: {
      stem: { type: "string" },
      choices: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "text", "figure_id"],
          properties: {
            label: { type: "string", enum: ["A", "B", "C", "D"] },
            text: { type: "string" },
            figure_id: { anyOf: [{ type: "string" }, { type: "null" }] }
          }
        }
      },
      correct_answer: { type: "string" },
      accepted_answers: { type: "array", items: { type: "string" } },
      explanation: { type: "string" },
      figures: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "keep", "kind"],
          properties: {
            id: { type: "string" },
            keep: { type: "boolean" },
            kind: { type: "string", enum: ["graph", "diagram", "table", "formula", "other"] }
          }
        }
      },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      notes: { type: "string" }
    }
  }
};

export async function main() {
  const pricing = readPricing();
  if (!["gemini", "openai"].includes(provider)) throw new Error("--provider must be gemini or openai");
  if (!Number.isFinite(delayMs) || delayMs < 0) throw new Error("Invalid --delay-ms");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 20) throw new Error("--concurrency must be an integer from 1 to 20");
  if (args.limit && (!Number.isInteger(Number(args.limit)) || Number(args.limit) < 1)) throw new Error("--limit must be a positive integer");
  if (args.sample && (!Number.isInteger(Number(args.sample)) || Number(args.sample) < 1)) throw new Error("--sample must be a positive integer");
  if (args.sample && (args.limit || args.only)) throw new Error("--sample cannot be combined with --limit or --only");
  if (args.force && args["cache-only"]) throw new Error("--force cannot be combined with --cache-only");
  if (!args["cache-only"]) {
    const key = provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
    if (!key) throw new Error(`${provider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY"} is missing in .env.local.`);
    if (!model) throw new Error("Set OPENAI_VISION_MODEL (or OPENAI_MODEL) in .env.local, or pass --model.");
    openai = new OpenAI({ apiKey: key, ...(provider === "gemini" ? { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" } : {}), maxRetries: 0, timeout: 120000 });
  }
  const startedAt = new Date().toISOString();
  const extracted = JSON.parse(await readFile(extractPath, "utf8"));
  if (!Array.isArray(extracted) || new Set(extracted.map((item) => item.source_question_id)).size !== extracted.length) throw new Error("Extraction must be an array with unique question ids");
  const only = args.only ? new Set(String(args.only).split(",")) : null;
  let queue = extracted.filter((item) => !only || only.has(item.source_question_id));

  if (args.limit) {
    queue = queue.slice(0, Number(args.limit));
  }
  if (args.sample) queue = sampleRecords(queue, Number(args.sample));
  if (!queue.length) throw new Error("No questions selected");
  if (only && [...only].some((id) => !extracted.some((item) => item.source_question_id === id))) throw new Error("--only contains an unknown question id");

  await mkdir(cacheDir, { recursive: true });
  console.log(`Converting ${queue.length} questions with ${model} (${concurrency} at a time)...`);

  let done = 0;
  const results = new Array(queue.length);
  const importPath = path.join(dataDir, "math-import.json");
  const reviewPath = path.join(dataDir, "math-review.json");
  const previous = existsSync(importPath) ? JSON.parse(readFileSync(importPath, "utf8")) : [];
  const previousReview = existsSync(reviewPath) ? JSON.parse(readFileSync(reviewPath, "utf8")) : [];
  let checkpoint = Promise.resolve();

  function persistProgress() {
    checkpoint = checkpoint.then(async () => {
      const completed = results.filter(Boolean);
      const ready = completed.filter((result) => result.record && !result.problems.length).map((result) => result.record);
      const review = completed.filter((result) => result.problems.length).map((result) => ({
        source_question_id: result.item.source_question_id,
        pages: `${result.item.source_page_start}-${result.item.source_page_end}`,
        problems: result.problems,
        question_image: result.item.question_image,
        ai_cache: path.join(cacheDir, `${result.item.source_question_id}.json`)
      }));
      const selected = completed.map((result) => result.item);
      await writeFile(importPath, JSON.stringify(mergeById(previous, ready, selected), null, 2));
      await writeFile(reviewPath, JSON.stringify(mergeById(previousReview, review, selected), null, 2));
    });
    return checkpoint;
  }

  await runPool(queue, concurrency, async (item, index) => {
    try {
      const ai = await convertWithCache(item);
      results[index] = buildRecord(item, ai);
    } catch (error) {
      if (error.status === 429 || [401, 403, 404].includes(error.status)) { stopped = true; console.log(`Stopping: ${error.message}`); return; }
      results[index] = { item, problems: [`AI request failed: ${error.message}`] };
    }

    done += 1;
    await persistProgress();
    if (done % 10 === 0 || done === queue.length) {
      console.log(`  ${done}/${queue.length}`);
    }
  });

  const completed = results.filter(Boolean);
  const ready = completed.filter((result) => result.record && result.problems.length === 0).map((result) => result.record);
  const review = completed
    .filter((result) => result.problems.length > 0)
    .map((result) => ({
      source_question_id: result.item.source_question_id,
      pages: `${result.item.source_page_start}-${result.item.source_page_end}`,
      problems: result.problems,
      question_image: result.item.question_image,
      ai_cache: path.join(cacheDir, `${result.item.source_question_id}.json`)
    }));

  // keep earlier successful conversions when this run covered only part of the bank
  const merged = mergeById(previous, ready, completed.map((result) => result.item));
  const mergedReview = mergeById(previousReview, review, completed.map((result) => result.item));

  await writeFile(importPath, JSON.stringify(merged, null, 2));
  await writeFile(reviewPath, JSON.stringify(mergedReview, null, 2));
  const summary = {
    started_at: startedAt, finished_at: new Date().toISOString(), provider, model: model ?? null, stopped, completed: completed.length,
    selected_ids: queue.map((item) => item.source_question_id),
    selected: queue.length, ready: ready.length, review: review.length,
    total_ready: merged.length, total_review: mergedReview.length,
    usage, pricing, estimated_cost_usd: estimateCost(usage, pricing),
    review_reasons: review.reduce((counts, row) => {
      for (const problem of row.problems) counts[problem] = (counts[problem] ?? 0) + 1;
      return counts;
    }, {})
  };
  await writeFile(path.join(dataDir, "math-run.json"), JSON.stringify(summary, null, 2));
  await mkdir(path.join(dataDir, "runs"), { recursive: true });
  await writeFile(path.join(dataDir, "runs", `${startedAt.replace(/[:.]/g, "-")}.json`), JSON.stringify(summary, null, 2));

  console.log(`\nReady to import: ${ready.length} (file now has ${merged.length}) -> ${importPath}`);
  console.log(`Need review:     ${review.length} (file now has ${mergedReview.length}) -> ${reviewPath}`);
  if (usage.input) {
    console.log(`Tokens this run: ${usage.input} in, ${usage.output} out`);
  }
  console.log(`API requests: ${usage.requests}; cache hits: ${usage.cache_hits}`);
  console.log(summary.estimated_cost_usd === null ? "Cost not estimated: set --input-price, --cached-input-price and --output-price (USD per million tokens)." : `Estimated cost this run: $${summary.estimated_cost_usd.toFixed(6)}`);
  if (review.length || stopped) process.exitCode = 2;
}

// Cover question types, crop locations, topics and difficulties before repeating them.
export function sampleRecords(items, count) {
  const remaining = [...items];
  const selected = [];
  const seen = new Set();
  const features = (item) => [
    `type:${item.question_type}`, `topic:${item.topic}`, `difficulty:${item.difficulty}`,
    ...(item.figures.length ? [...new Set(item.figures.map((figure) => figure.location === "stem" ? "figures:stem" : "figures:choices"))] : ["figures:none"])
  ];
  while (remaining.length && selected.length < count) {
    let best = 0;
    let bestScore = -1;
    for (let i = 0; i < remaining.length; i += 1) {
      const score = features(remaining[i]).filter((feature) => !seen.has(feature)).length;
      if (score > bestScore) { best = i; bestScore = score; }
    }
    const [item] = remaining.splice(best, 1);
    selected.push(item);
    for (const feature of features(item)) seen.add(feature);
  }
  return selected;
}
export function mergeById(previous, current, selected) {
  const selectedIds = new Set(selected.map((item) => item.source_question_id));
  return [...previous.filter((item) => !selectedIds.has(item.source_question_id)), ...current];
}

function readPricing() {
  const rates = [args["input-price"], args["cached-input-price"], args["output-price"]];
  if (rates.some((value) => value === undefined)) return null;
  if (rates.some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)) throw new Error("Token prices must be nonnegative numbers");
  return { input: Number(rates[0]), cached_input: Number(rates[1]), output: Number(rates[2]) };
}

export function estimateCost(tokens, rates) {
  if (!rates) return null;
  return ((tokens.input - tokens.cached_input) * rates.input + tokens.cached_input * rates.cached_input + tokens.output * rates.output) / 1e6;
}

async function convertWithCache(item) {
  const cachePath = path.join(cacheDir, `${item.source_question_id}.json`);
  const hash = createHash("sha256").update(INSTRUCTIONS).update(JSON.stringify(RESPONSE_FORMAT)).update(JSON.stringify(item));
  for (const file of [item.question_image, item.rationale_image, ...item.figures.map((figure) => figure.file)]) hash.update(await readFile(file));
  const fingerprint = hash.digest("hex");

  if (existsSync(cachePath) && !args.force) {
    const cached = JSON.parse(await readFile(cachePath, "utf8"));
    if (cached._conversion?.fingerprint === fingerprint && (cached._conversion.provider ?? "openai") === provider && (!model || cached._conversion.model === model)) {
      usage.cache_hits += 1;
      return cached;
    }
  }
  if (args["cache-only"]) throw new Error("No matching API cache for the current prompt, images and model");

  const ai = await withRetries(() => askModel(item));
  ai._conversion.fingerprint = fingerprint;
  await writeFile(cachePath, JSON.stringify(ai, null, 2));
  return ai;
}

async function askModel(item) {
  const content = [
    {
      type: "input_text",
      text: `Question ${item.source_question_id}. Type: ${item.question_type}. Image 1 is the question (stem and choices).`
    },
    await imagePart(item.question_image)
  ];

  for (const figure of item.figures) {
    content.push({ type: "input_text", text: `Crop ${figure.id} — found in: ${figure.location === "stem" ? "stem" : `choice ${figure.location}`}` });
    content.push(await imagePart(figure.file));
  }

  content.push({ type: "input_text", text: "Last image: the rationale." });
  content.push(await imagePart(item.rationale_image));

  await pace();
  const messages = [{ role: "system", content: INSTRUCTIONS }, { role: "user", content: content.map((part) => part.type === "input_text" ? { type: "text", text: part.text } : { type: "image_url", image_url: { url: part.image_url, detail: "high" } }) }];
  const format = { type: "json_schema", json_schema: { name: RESPONSE_FORMAT.name, strict: true, schema: RESPONSE_FORMAT.schema } };
  let response;
  try {
    response = await openai.chat.completions.create({ model, messages, response_format: format });
  } catch (error) {
    if (error.status !== 400 || !/response.format|json.schema|structured/i.test(error.message)) throw error;
    await pace();
    response = await openai.chat.completions.create({ model, messages: [{ role: "system", content: `${INSTRUCTIONS}\nReturn only a JSON object matching this schema: ${JSON.stringify(RESPONSE_FORMAT.schema)}` }, messages[1]] });
  }
  usage.input += response.usage?.prompt_tokens ?? 0;
  usage.cached_input += response.usage?.prompt_tokens_details?.cached_tokens ?? 0;
  usage.output += response.usage?.completion_tokens ?? 0;
  usage.requests += 1;
  const choice = response.choices?.[0];
  if (!choice?.message?.content || choice.finish_reason !== "stop") throw new Error(`Incomplete or empty response: ${choice?.finish_reason}`);
  const raw = choice.message.content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(raw);
  validateSchema(parsed, RESPONSE_FORMAT.schema);
  return { ...parsed, _conversion: { provider, model, response_id: response.id, usage: response.usage, created_at: new Date().toISOString() } };
}

function validateSchema(value, schema) {
  if (schema.anyOf) {
    if (!schema.anyOf.some((part) => { try { validateSchema(value, part); return true; } catch { return false; } })) throw new Error("JSON schema type mismatch");
    return;
  }
  if (schema.type === "null") { if (value !== null) throw new Error("Expected null"); return; }
  if (schema.type === "array") { if (!Array.isArray(value)) throw new Error("Expected array"); value.forEach((item) => validateSchema(item, schema.items)); return; }
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected object");
    for (const key of schema.required) if (!(key in value)) throw new Error(`Missing ${key}`);
    for (const key of Object.keys(value)) { if (!schema.properties[key]) throw new Error(`Unexpected ${key}`); validateSchema(value[key], schema.properties[key]); }
    return;
  }
  if (typeof value !== schema.type || (schema.enum && !schema.enum.includes(value))) throw new Error("JSON schema value mismatch");
}

async function pace() {
  const previous = pacing;
  let release;
  pacing = new Promise((resolve) => { release = resolve; });
  await previous;
  try { const wait = Math.max(0, nextRequest - Date.now()); if (wait) await new Promise((resolve) => setTimeout(resolve, wait)); nextRequest = Date.now() + delayMs; } finally { release(); }

}

async function imagePart(filePath) {
  const buffer = await readFile(filePath);
  return { type: "input_image", detail: "high", image_url: `data:image/png;base64,${buffer.toString("base64")}` };
}

export function buildRecord(item, ai) {
  const problems = [];
  if (ai._conversion?.provider === "gemini") problems.push("verify transcription against PDF image: Gemini output may silently corrupt math or text");
  const figuresById = new Map(item.figures.map((figure) => [figure.id, figure]));
  const kept = new Set(ai.figures.filter((figure) => figure.keep && figuresById.has(figure.id)).map((figure) => figure.id));
  if ([...kept].some((id) => figuresById.get(id).location === "stem")) problems.push("verify stem figure placement against question image");
  if (!ai.stem.trim()) problems.push("empty stem");
  if (!ai.explanation.trim()) problems.push("empty rationale");
  if (ai.figures.length !== item.figures.length || new Set(ai.figures.map((figure) => figure.id)).size !== ai.figures.length || ai.figures.some((figure) => !figuresById.has(figure.id))) problems.push("crop classifications must cover every supplied crop exactly once");
  for (const figure of ai.figures) {
    if (figure.keep !== ["graph", "diagram"].includes(figure.kind)) problems.push(`invalid keep/kind for ${figure.id}`);
  }
  for (const match of ai.stem.matchAll(/\[\[(.*?)\]\]/g)) {
    const figure = figuresById.get(match[1]);
    if (!figure || !kept.has(match[1]) || figure.location !== "stem") problems.push(`invalid stem figure reference: ${match[1]}`);
    if (!ai.stem.split("\n").some((line) => line.trim() === match[0])) problems.push(`stem figure ${match[1]} must be on its own line`);
  }
  for (const id of kept) {
    const figure = figuresById.get(id);
    const uses = figure.location === "stem" ? ai.stem.split(`[[${id}]]`).length - 1 : ai.choices.filter((choice) => choice.figure_id === id && choice.label === figure.location).length;
    if (uses !== 1) problems.push(`kept crop ${id} must appear exactly once in ${figure.location}`);
  }
  for (const choice of ai.choices) {
    if (choice.figure_id && (!kept.has(choice.figure_id) || figuresById.get(choice.figure_id)?.location !== choice.label)) problems.push(`invalid figure for choice ${choice.label}: ${choice.figure_id}`);
    if (/\[\[.*?\]\]/.test(choice.text)) problems.push(`figure placeholder in choice ${choice.label} text`);
  }
  for (const [field, text] of [["stem", ai.stem], ["rationale", ai.explanation], ...ai.choices.map((choice) => [`choice ${choice.label}`, choice.text])]) {
    problems.push(...validateMath(text).map((problem) => `${field}: ${problem}`));
  }

  // --- answer checks against the PDF text layer ---
  const pdfAnswers = splitAnswers(item.pdf_correct_answer);
  const examples = item.pdf_entry_examples ?? [];

  if (item.question_type === "multiple-choice") {
    if (ai.choices.map((choice) => choice.label).join("") !== "ABCD") problems.push("expected exactly four choices in A, B, C, D order");
    const letter = ai.correct_answer.trim().toUpperCase().replace(/\.$/, "");
    if (!/^[A-D]$/.test(pdfAnswers[0] ?? "")) problems.push("PDF text has no readable answer letter; review required");
    if (!/^[A-D]$/.test(letter)) problems.push("AI answer is not A, B, C or D");
    if (/^[A-D]$/.test(pdfAnswers[0] ?? "") && letter !== pdfAnswers[0]) {
      problems.push(`answer mismatch: PDF says ${pdfAnswers[0]}, AI read ${ai.correct_answer}`);
    }
    if (ai.accepted_answers.length) problems.push("multiple-choice must not have accepted_answers");
    for (const choice of ai.choices) {
      if (!choice.text.trim() && !(choice.figure_id && kept.has(choice.figure_id))) {
        problems.push(`choice ${choice.label} is empty`);
      }
    }
  } else {
    if (ai.choices.length > 0) problems.push("AI found choices in a student-produced-response question");
    const fromPdf = [...pdfAnswers, ...examples];
    const aiAnswers = [ai.correct_answer, ...ai.accepted_answers];
    if (fromPdf.length === 0) {
      problems.push("PDF text has no readable answer; check the AI answer by hand");
    } else if (!fromPdf.some((pdfAnswer) => sameAnswer(ai.correct_answer, pdfAnswer))) {
      problems.push(`answer mismatch: PDF says ${fromPdf.join(" / ")}, AI read ${aiAnswers.join(" / ")}`);
    }
    for (const answer of aiAnswers) {
      if (toNumber(answer) === null || !fromPdf.some((pdfAnswer) => sameAnswer(answer, pdfAnswer))) problems.push(`unsupported grid-in answer: ${answer}`);
    }
    if (fromPdf.some((answer) => toNumber(answer) === null)) problems.push("PDF contains an unrecognized grid-in answer; review required");
  }

  if (ai.confidence !== "high") problems.push(`AI confidence ${ai.confidence}: ${ai.notes}`);
  if (/\$[^$\s][^$]*\$/.test(ai.stem.replace(/\$\d[\d,.]*/g, ""))) problems.push("stem uses $...$ math; expected \\( \\)");

  // --- stem figures: [[F2]] -> [[img:0]] in the order they appear ---
  const stemFigureIds = [];
  let question = ai.stem.replace(/\[\[(F\d+)\]\]/g, (match, id) => {
    if (!kept.has(id) || figuresById.get(id).location !== "stem") return "";
    if (!stemFigureIds.includes(id)) stemFigureIds.push(id);
    return `[[img:${stemFigureIds.indexOf(id)}]]`;
  });

  const choices = ai.choices.map((choice) => {
    const figure = choice.figure_id && kept.has(choice.figure_id) ? figuresById.get(choice.figure_id) : null;
    return { label: choice.label, text: choice.text.trim(), ...(figure ? { image_file: figure.file } : {}) };
  });

  const accepted =
    item.question_type === "multiple-choice"
      ? []
      : unique([...pdfAnswers, ...examples].map((answer) => answer.trim()).filter((answer) => toNumber(answer) !== null));

  const record = {
    source_question_id: item.source_question_id,
    source_name: item.source_name,
    section: "math",
    category: item.category,
    topic: item.topic,
    difficulty: item.difficulty,
    is_bluebook: true,
    question_type: item.question_type,
    question: question.trim(),
    choices,
    correct_answer:
      item.question_type === "multiple-choice"
        ? ai.correct_answer.trim().toUpperCase().replace(/\.$/, "")
        : accepted.some((answer) => sameAnswer(answer, ai.correct_answer))
          ? ai.correct_answer.trim() // the form the rationale uses, e.g. 3/17 rather than .1764
          : accepted[0] ?? ai.correct_answer,
    explanation: ai.explanation.trim(),
    image_files: stemFigureIds.map((id) => figuresById.get(id).file),
    scoring_metadata: accepted.length ? { accepted_answers: accepted } : null,
    source_page_start: item.source_page_start,
    source_page_end: item.source_page_end
  };

  return { item, record, problems };
}

function splitAnswers(raw) {
  return String(raw ?? "")
    .split(/,\s*|\s+or\s+/)
    .map((answer) => answer.trim().toUpperCase().replace(/^([A-D])\.$/, "$1"))
    .filter(Boolean);
}

function sameAnswer(a, b) {
  const left = toNumber(a);
  const right = toNumber(b);
  if (left !== null && right !== null) return Math.abs(left - right) < 1e-9;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function toNumber(value) {
  const text = String(value).trim().replace(/−/g, "-");
  const fraction = text.match(/^(-?\d*\.?\d+)\s*\/\s*(-?\d*\.?\d+)$/);
  const number = fraction ? (Number(fraction[2]) === 0 ? NaN : Number(fraction[1]) / Number(fraction[2])) : /^-?\d*\.?\d+$/.test(text) ? Number(text) : NaN;
  return Number.isFinite(number) ? number : null;
}

export function validateMath(text) {
  const problems = [];
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)) problems.push("invalid control character, possibly corrupted LaTeX");
  if (/X[^\n]{1,50}X/.test(text)) problems.push("possible corrupted mathematical delimiters (X)");
  if (/\\(?:frac|sqrt|le|ge|times|begin)\b/.test(text.replace(/\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, ""))) problems.push("LaTeX command outside math delimiters");
  if (/(?:^|\n)\s*\[\s*\n[\s\S]*?\n\s*\](?:\s*\n|$)/.test(text)) problems.push("display math has bare brackets instead of LaTeX delimiters");
  const delimiters = /\\([()[\]])/g;
  let opening = null;
  let start = 0;
  for (const match of text.matchAll(delimiters)) {
    const symbol = match[1];
    if (symbol === "(" || symbol === "[") {
      if (opening) problems.push("nested or unclosed math delimiter");
      opening = symbol;
      start = match.index + 2;
    } else if (!opening || (opening === "(" ? symbol !== ")" : symbol !== "]")) {
      problems.push("unmatched math delimiter");
    } else {
      try { katex.renderToString(text.slice(start, match.index), { throwOnError: true, strict: "ignore", trust: false }); }
      catch { problems.push("invalid KaTeX expression"); }
      opening = null;
    }
  }
  if (opening) problems.push("unclosed math delimiter");
  if (/\$[^$]+\$/.test(text.replace(/\$\d[\d,.]*/g, ""))) problems.push("uses $...$ math; expected \\( \\)");
  return problems;
}

function unique(values) {
  return [...new Set(values)];
}

async function runPool(items, size, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length && !stopped) {
      const index = next++;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

async function withRetries(task, attempts = 4) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (error.status === 429 && /per.day|per_day|daily|perday|GenerateRequestsPerDay/i.test(JSON.stringify(error.error ?? error.message))) throw error;
      const retryable = error.status === 429 || error.status >= 500 || error instanceof SyntaxError;
      if (!retryable || attempt >= attempts) throw error;
      const retryAfter = Number(error.headers?.get?.("retry-after"));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : (error.status === 429 ? 20000 : 2000) * 2 ** (attempt - 1);
      console.log(`Retrying in ${Math.ceil(wait / 1000)}s (attempt ${attempt}/${attempts})`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}

function parseArgs(argv) {
  const parsed = {};
  const booleanOptions = new Set(["force", "cache-only"]);
  const valueOptions = new Set(["dir", "model", "concurrency", "limit", "sample", "only", "input-price", "cached-input-price", "output-price", "provider", "delay-ms"]);
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) throw new Error(`Unexpected argument: ${argv[i]}`);
    const key = argv[i].replace(/^--/, "");
    if (booleanOptions.has(key)) parsed[key] = true;
    else if (valueOptions.has(key) && argv[i + 1] && !argv[i + 1].startsWith("--")) parsed[key] = argv[++i];
    else throw new Error(`Unknown option or missing value: --${key}`);
  }
  return parsed;
}

function loadEnvLocal() {
  try {
    readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .forEach((line) => {
        const [key, ...rest] = line.split("=");
        process.env[key] ??= rest.join("=").replace(/^['"]|['"]$/g, "");
      });
  } catch {
    // variables may already be exported by the shell
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}


