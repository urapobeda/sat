import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const cache = new Map();
function load(relative) {
  const base = path.join(root, relative);
  const filename = [base, base + ".ts", base + ".tsx", base + ".json"].find(name => fs.existsSync(name) && fs.statSync(name).isFile());
  if (!filename) throw new Error(`Test import not found: ${relative}`);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiledModule = { exports: {} }; cache.set(filename, compiledModule);
  if (filename.endsWith(".json")) return compiledModule.exports = JSON.parse(fs.readFileSync(filename, "utf8"));
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const localRequire = specifier => {
    // Vocabulary/account network loading is separate from the submitted-review presentation.
    if (specifier === "@/components/vocabulary/VocabularySelection") return { VocabularySelection: ({ children }) => React.createElement(React.Fragment, null, children) };
    if (specifier.startsWith("@/")) return load(specifier.slice(2));
    return require(specifier);
  };
  new Function("require", "module", "exports", compiled)(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const { homeworkReviewItems, visibleHomeworkReview } = load("lib/homeworkReview.ts");
const { HomeworkReview } = load("components/homework/HomeworkReview.tsx");
const questions = Array.from({ length: 4 }, (_, i) => ({ id: `q${i+1}`, question: `Question text ${i+1}`, section: "math", difficulty: "medium", topic: "Algebra", imageUrls: [], isBluebook: false, questionType: i === 2 ? "student-produced-response" : "multiple-choice", choices: i === 2 ? [] : [{ label: "A", text: "First option", imageUrl: null }, { label: "B", text: "Second option", imageUrl: "https://example.invalid/graph.png" }] }));
const reviews = questions.map((question, i) => ({ ...question, correctAnswer: i === 2 ? "0.5" : "B", correctLabel: i === 2 ? null : "B", isCorrect: i === 0 || i === 2, explanation: `Approved explanation ${i+1}` }));
const answers = { q1: "B", q2: "A", q3: "1/2" };
const items = homeworkReviewItems(questions, [...reviews].reverse(), answers, true);
assert.deepEqual(items.map(item => item.status), ["correct", "incorrect", "correct", "unanswered"]);
assert.equal(items[2].status, "correct", "numeric equivalence is graded by the server, not string comparison");
const filtered = visibleHomeworkReview(items, true, "q1");
assert.deepEqual(filtered.items.map(item => item.number), [2,4]); assert.equal(filtered.current.question.id, "q2");
assert.equal(visibleHomeworkReview(items, true, "q4").index, 1);
assert.equal(visibleHomeworkReview(items, false, "missing").current.question.id, "q1");
assert.equal(visibleHomeworkReview([], true, null).current, null);
assert.equal(homeworkReviewItems(questions, reviews.slice(0,1), answers, true)[1].status, "unavailable");
const hiddenItems = homeworkReviewItems(questions, reviews, answers, false);
assert.ok(hiddenItems.every(item => item.review === null && item.status === "hidden"));
const feedback = [
  { id:"whole", question_id:null, body:"Whole submission comment", created_at:"2026-11-22T10:00:00Z" },
  { id:"first", question_id:"q1", body:"Comment beside the first question", created_at:"2026-11-22T10:01:00Z" },
  { id:"second", question_id:"q2", body:"Only on the second question", created_at:"2026-11-22T10:02:00Z" }
];
const props = { questions, reviews, answers, feedback, answerTimes:{q1:45}, showAnswers:true, canRetake:true, onRetake:()=>{} };
const html = renderToStaticMarkup(React.createElement(HomeworkReview,props));
assert.ok(html.includes("Only mistakes")); assert.ok(html.includes("Retake"));
assert.ok(html.includes("Your answer")); assert.ok(html.includes("Correct answer"));
assert.ok(html.includes("Approved explanation 1"));assert.ok(!html.includes("Approved explanation 2"),"only one question is rendered");
assert.equal((html.match(/Whole submission comment/g)??[]).length,1);
assert.equal((html.match(/Comment beside the first question/g)??[]).length,1);
assert.ok(!html.includes("Only on the second question"));
assert.ok(html.includes('aria-label="Question 2, incorrect"'));assert.ok(html.includes('aria-current="step"'));
assert.ok(html.includes("https://example.invalid/graph.png"));assert.ok(html.includes("Time on question: 0:45"));
const hidden = renderToStaticMarkup(React.createElement(HomeworkReview,{...props,showAnswers:false,canRetake:false}));
assert.ok(!hidden.includes("Approved explanation"));assert.ok(!hidden.includes(">Correct answer<"));assert.ok(!hidden.includes("Only mistakes"));assert.ok(!hidden.includes("Retake"));
assert.ok(!hidden.includes('aria-label="Question 2, incorrect"'));assert.ok(hidden.includes("Your answer"));assert.ok(hidden.includes("Comment beside the first question"));
const wrong = renderToStaticMarkup(React.createElement(HomeworkReview,{...props,questions:[questions[1]],reviews:[reviews[1]],feedback:[]}));
assert.ok(wrong.includes("Incorrect."));assert.ok(wrong.includes("Correct answer:"));assert.ok(wrong.includes("Approved explanation 2"));
const numeric = renderToStaticMarkup(React.createElement(HomeworkReview,{...props,questions:[questions[2]],reviews:[reviews[2]],feedback:[]}));
assert.ok(numeric.includes("1/2")); assert.ok(numeric.includes("0.5")); assert.ok(numeric.includes("Correct."));
console.log("Homework review tests passed: original numbering, mistake filtering, server numeric verdicts, hidden results, single-question rendering, graph choices, adjacent comments and retake visibility.");
