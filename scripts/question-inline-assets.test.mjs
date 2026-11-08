import assert from "node:assert/strict";
import test from "node:test";
import { resolveQuestionInlineAssets } from "./question-inline-assets.mjs";

const token = "[[asset:35:22:inline-a.png]]";
const url = "https://example.supabase.co/storage/v1/object/public/question-assets/questions/id/inline-a.png";
const table = { caption: "Values", rows: [[{ text: token, colspan: 2, rowspan: 1, header: false }]] };
const row = {
  question: `Before ${token} after`, explanation: token,
  choices: [{ label: "A", text: `[[table:${Buffer.from(JSON.stringify(table)).toString("base64")}]]` }],
  inline_image_files: { "inline-a.png": "assets/id/inline-a.png" }
};

test("replace PNG references in stem, explanation and encoded table cells without embedding image bytes", () => {
  const result = resolveQuestionInlineAssets(row, () => url);
  assert.equal(result.question, `Before [[asset:35:22:${url}]] after`);
  assert.equal(result.explanation, `[[asset:35:22:${url}]]`);
  const decoded = JSON.parse(Buffer.from(result.choices[0].text.slice(8, -2), "base64").toString("utf8"));
  assert.equal(decoded.rows[0][0].text, `[[asset:35:22:${url}]]`);
  assert.equal(decoded.rows[0][0].colspan, 2);
  assert.equal(row.question, `Before ${token} after`, "source record stays reusable");
});

test("missing mappings, old base64 PNGs and non-HTTPS destinations fail before uploading", () => {
  assert.throws(() => resolveQuestionInlineAssets({ ...row, inline_image_files: {} }, () => url), /Missing inline image/);
  assert.throws(() => resolveQuestionInlineAssets(row, () => "javascript:alert(1)"), /HTTPS/);
  const oldTable = { ...table, rows: [[{ text: "[[png:1:1:iVBORw0KGgo=]]" }]] };
  assert.throws(() => resolveQuestionInlineAssets({ ...row, choices: [{ text: `[[table:${Buffer.from(JSON.stringify(oldTable)).toString("base64")}]]` }] }, () => url), /re-run/);
});

test("content without inline assets retains text and normal choice image fields", () => {
  const input = { question: "Find \\(x\\).", explanation: "x = 1", choices: [{ label: "A", text: "", image_file: "graph.png" }] };
  assert.deepEqual(resolveQuestionInlineAssets(input, () => url), input);
});
