import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const russian = /[\u0410-\u044f\u0401\u0451]/u;

// Check authored UI/API copy, not comments, identifiers, or database content.
function russianCopy(filename, source) {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const matches = [];
  function visit(node) {
    const templateToken = node.kind >= ts.SyntaxKind.FirstTemplateToken && node.kind <= ts.SyntaxKind.LastTemplateToken;
    if ((ts.isStringLiteralLike(node) || ts.isJsxText(node) || templateToken) && russian.test(node.text)) {
      const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
      matches.push(`${filename}:${line}: ${node.text.trim()}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return matches;
}

assert.deepEqual(russianCopy("example.ts", '// \u0422\u0435\u043a\u0441\u0442\nconst label = "Save";'), []);
assert.equal(russianCopy("example.tsx", 'const ui = <button aria-label="\u0412\u0445\u043e\u0434">\u0412\u043e\u0439\u0442\u0438</button>;').length, 2);
assert.equal(russianCopy("example.ts", 'const label = `Question ${index}, \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d`;').length, 1);

async function checkDirectory(directory) {
  const matches = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) matches.push(...await checkDirectory(filename));
    else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      matches.push(...russianCopy(filename, await readFile(path.join(root, filename), "utf8")));
    }
  }
  return matches;
}
const matches = (await Promise.all(["app", "components", "lib"].map(checkDirectory))).flat();
assert.deepEqual(matches, [], `Russian UI/API copy found:\n${matches.join("\n")}`);
console.log("English UI tests passed (all app/components/lib TS/TSX copy, including JSX, labels and templates; comments excluded)");
