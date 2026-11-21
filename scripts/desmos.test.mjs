import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/desmos.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { target: 9, module: 99 } }).outputText;
const { loadDesmos, mountDesmos, createDesmosStateStore } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

// Import is safe during SSR and does not start a request.
await assert.rejects(loadDesmos(), /browser/);
const originalWindow = globalThis.window, originalDocument = globalThis.document;
const originalWarn = console.warn, originalKey = process.env.NEXT_PUBLIC_DESMOS_API_KEY;
const scripts = [], warnings = [];
globalThis.window = { setTimeout, clearTimeout };
globalThis.document = {
  createElement: () => ({ remove() { this.removed = true; } }),
  head: { appendChild(script) { scripts.push(script); } }
};
console.warn = (message) => warnings.push(message);
delete process.env.NEXT_PUBLIC_DESMOS_API_KEY;
try {
  const first = loadDesmos(), concurrent = loadDesmos();
  assert.equal(first, concurrent);
  assert.equal(scripts.length, 1);
  assert.match(scripts[0].src, /v1\.12\/calculator\.js\?apiKey=dcb31709b452b1cf9dc26972add0fda6&lang=en/);
  assert.equal(warnings.length, 1);
  scripts[0].onerror();
  await assert.rejects(first, /Could not load the calculator/);
  assert.equal(scripts[0].removed, true);
  process.env.NEXT_PUBLIC_DESMOS_API_KEY = "own key&test";
  const retry = loadDesmos();
  assert.equal(scripts.length, 2);
  assert.match(scripts[1].src, /apiKey=own%20key%26test/);
  const api = { GraphingCalculator() {} };
  window.Desmos = api;
  scripts[1].onload();
  assert.equal(await retry, api);
  assert.equal(await loadDesmos(), api);
  assert.equal(scripts.length, 2, "reopening uses the already loaded SDK");

  const states = createDesmosStateStore(), otherAttempt = createDesmosStateStore();
  const original = { expressions: { list: [{ latex: "x^2" }] } };
  states.set("q1", original);
  original.expressions.list[0].latex = "changed";
  assert.equal(states.get("q1").expressions.list[0].latex, "x^2");
  assert.equal(states.get("q2"), undefined);
  assert.equal(otherAttempt.get("q1"), undefined);

  let current, callback, destroyed = 0, unobserved = 0, resized = 0;
  const fake = { GraphingCalculator(element, options) {
    assert.equal(element.id, "calculator");
    assert.equal(options.language, "en");
    return {
      setState(value) { current = value; }, getState() { return current; },
      observeEvent(event, fn) { assert.equal(event, "change"); callback = fn; },
      unobserveEvent(event) { assert.equal(event, "change"); unobserved++; },
      resize() { resized++; }, destroy() { destroyed++; }
    };
  } };
  const panel = mountDesmos(fake, { id: "calculator" }, states, "q1");
  assert.equal(current.expressions.list[0].latex, "x^2");
  current = { expressions: { list: [{ latex: "y=3x" }] } };
  callback();
  assert.equal(states.get("q1").expressions.list[0].latex, "y=3x");
  panel.resize(); panel.destroy(); panel.destroy(); panel.resize();
  assert.equal(destroyed, 1); assert.equal(unobserved, 1); assert.equal(resized, 1);
  assert.equal(states.get("q2"), undefined);
  states.clear(); assert.equal(states.get("q1"), undefined);
  assert.throws(() => mountDesmos({ GraphingCalculator() { return {
    setState() { throw Error("Bad state"); }, destroy() { destroyed++; }
  }; } }, {}, { get: () => ({}) }, "q1"), /Bad state/);
  assert.equal(destroyed, 2, "failed initialization still destroys the calculator");
  console.log("Desmos tests passed (lazy/shared SDK, demo/custom keys, retry, per-question/attempt state, restoration and cleanup)");
} finally {
  globalThis.window = originalWindow; globalThis.document = originalDocument;
  console.warn = originalWarn;
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_DESMOS_API_KEY;
  else process.env.NEXT_PUBLIC_DESMOS_API_KEY = originalKey;
}
