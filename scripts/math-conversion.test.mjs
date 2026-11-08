import assert from "node:assert/strict";
import test from "node:test";
import { buildRecord, estimateCost, mergeById, validateMath } from "./convert-math-questions.mjs";

const item = {
  source_question_id: "fixture", source_name: "test fixture", category: "Algebra",
  topic: "Linear Functions", difficulty: "easy", question_type: "multiple-choice",
  pdf_correct_answer: "B", pdf_entry_examples: [], figures: [],
  source_page_start: 1, source_page_end: 1
};
const ai = {
  stem: "What is \\(x\\)?", choices: ["A", "B", "C", "D"].map((label, i) => ({ label, text: `\\(${i}\\)`, figure_id: null })),
  correct_answer: "B", accepted_answers: [], explanation: "The answer is \\(1\\).",
  figures: [], confidence: "high", notes: ""
};
const clone = (value) => structuredClone(value);

test("multiple-choice requires a readable, matching official answer and unique ordered choices", () => {
  assert.deepEqual(buildRecord(item, ai).problems, []);
  assert.match(buildRecord({ ...item, pdf_correct_answer: "" }, ai).problems.join(), /no readable answer/);
  assert.match(buildRecord(item, { ...ai, correct_answer: "A" }).problems.join(), /answer mismatch/);
  const duplicate = clone(ai);
  duplicate.choices[1].label = "A";
  assert.match(buildRecord(item, duplicate).problems.join(), /A, B, C, D order/);
});

test("grid-in accepts official fraction/decimal forms and never adds unsupported AI answers", () => {
  const grid = { ...item, question_type: "student-produced-response", pdf_correct_answer: "3/4", pdf_entry_examples: [".75"] };
  const transcription = { ...ai, choices: [], correct_answer: "0.75", accepted_answers: ["3/4", ".75"] };
  const result = buildRecord(grid, transcription);
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.record.scoring_metadata.accepted_answers, ["3/4", ".75"]);
  const extra = buildRecord(grid, { ...transcription, accepted_answers: ["3/4", "2"] });
  assert.match(extra.problems.join(), /unsupported grid-in answer: 2/);
  assert(!extra.record.scoring_metadata.accepted_answers.includes("2"));
  assert.match(buildRecord(grid, { ...transcription, correct_answer: "2" }).problems.join(), /answer mismatch/);
  assert.match(buildRecord(grid, { ...transcription, correct_answer: "1/0" }).problems.join(), /unsupported/);
});

test("printed rounded decimal examples remain accepted even if not numerically equal to the fraction", () => {
  const grid = { ...item, question_type: "student-produced-response", pdf_correct_answer: "3/17", pdf_entry_examples: [".1764", ".1765"] };
  const result = buildRecord(grid, { ...ai, choices: [], correct_answer: "3/17", accepted_answers: [".1764", ".1765"] });
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.record.scoring_metadata.accepted_answers, ["3/17", ".1764", ".1765"]);
});

test("stem graphs preserve their order; missing, unknown and repeated references require review", () => {
  const source = { ...item, figures: [{ id: "F1", location: "stem", file: "graph.png" }] };
  const transcription = { ...ai, stem: "[[F1]]\n\nWhat is \\(x\\)?", figures: [{ id: "F1", keep: true, kind: "graph" }] };
  const result = buildRecord(source, transcription);
  assert.deepEqual(result.problems, ["verify stem figure placement against question image"]);
  assert.equal(result.record.question, "[[img:0]]\n\nWhat is \\(x\\)?");
  assert.deepEqual(result.record.image_files, ["graph.png"]);
  assert.match(buildRecord(source, { ...transcription, stem: ai.stem }).problems.join(), /exactly once/);
  assert.match(buildRecord(source, { ...transcription, stem: "[[F99]]" }).problems.join(), /invalid stem figure/);
  assert.match(buildRecord(source, { ...transcription, stem: "[[F1]]\n[[F1]]" }).problems.join(), /exactly once/);
});

test("four graph choices map to their own crops; cross-choice reuse is rejected", () => {
  const source = { ...item, figures: ["A", "B", "C", "D"].map((label, i) => ({ id: `F${i + 1}`, location: label, file: `${label}.png` })) };
  const transcription = { ...ai,
    choices: source.figures.map((figure) => ({ label: figure.location, text: "", figure_id: figure.id })),
    figures: source.figures.map((figure) => ({ id: figure.id, keep: true, kind: "graph" }))
  };
  const result = buildRecord(source, transcription);
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.record.choices.map((choice) => choice.image_file), ["A.png", "B.png", "C.png", "D.png"]);
  const wrong = clone(transcription);
  wrong.choices[0].figure_id = "F2";
  assert.match(buildRecord(source, wrong).problems.join(), /invalid figure for choice A/);
  assert.match(buildRecord(source, { ...transcription, figures: [] }).problems.join(), /every supplied crop/);
});

test("medium confidence and invalid math in choices or explanation require review", () => {
  assert.match(buildRecord(item, { ...ai, confidence: "medium", notes: "blurry" }).problems.join(), /confidence medium/);
  assert.deepEqual(validateMath("Price $125 and $3.50; \\(\\frac{3}{4}\\)."), []);
  assert.match(validateMath("\\(x").join(), /unclosed/);
  assert.match(validateMath("\\(\\notARealCommand{3}\\)").join(), /invalid KaTeX/);
  assert.match(validateMath("$x+1$").join(), /uses \$/);
  assert.match(buildRecord(item, { ...ai, explanation: "\\(\\notARealCommand{3}\\)" }).problems.join(), /rationale: invalid KaTeX/);
});

test("a partial retry retains earlier review rows and replaces only selected ids", () => {
  const previous = [{ source_question_id: "a", problems: ["old"] }, { source_question_id: "b", problems: ["keep"] }];
  assert.deepEqual(mergeById(previous, [], [{ source_question_id: "a" }]), [previous[1]]);
  const current = [{ source_question_id: "a", problems: ["new"] }];
  assert.deepEqual(mergeById(previous, current, [{ source_question_id: "a" }]), [previous[1], ...current]);
});

test("cost separates cached input tokens and leaves unknown pricing unestimated", () => {
  assert.equal(estimateCost({ input: 1000000, cached_input: 250000, output: 500000 }, { input: 2, cached_input: 1, output: 8 }), 5.75);
  assert.equal(estimateCost({ input: 10, cached_input: 0, output: 5 }, null), null);
});
