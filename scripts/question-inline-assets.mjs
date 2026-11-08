/** Resolve local inline image tokens, including images inside encoded tables. */
export function resolveInlineText(text, files, publicUrl) {
  if (typeof text !== "string") throw new Error("Expected question text");
  if (/\[\[png:/.test(text)) throw new Error("Embedded base64 PNG found: re-run npm run questions:flashsat-prepare before importing");
  return text.replace(/\[\[table:([A-Za-z0-9+/=]+)\]\]/g, (_, payload) => {
    const table = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    if (!Array.isArray(table.rows) || typeof table.caption !== "string") throw new Error("Invalid rich table");
    table.caption = resolveInlineText(table.caption, files, publicUrl);
    for (const row of table.rows) for (const cell of row) cell.text = resolveInlineText(cell.text, files, publicUrl);
    return `[[table:${Buffer.from(JSON.stringify(table)).toString("base64")}]]`;
  }).replace(/\[\[asset:(\d+):(\d+):([^\s\]]+)\]\]/g, (_, width, height, name) => {
    if (!Object.hasOwn(files, name)) throw new Error(`Missing inline image mapping: ${name}`);
    const url = publicUrl(files[name]);
    if (!/^https:\/\/[^\s\]]+$/.test(url)) throw new Error("Inline assets require an HTTPS Storage URL");
    return `[[asset:${width}:${height}:${url}]]`;
  });
}

export function resolveQuestionInlineAssets(question, publicUrl) {
  const files = question.inline_image_files ?? {};
  return {
    ...question,
    question: resolveInlineText(question.question, files, publicUrl),
    explanation: resolveInlineText(question.explanation, files, publicUrl),
    choices: (question.choices ?? []).map((choice) => ({ ...choice, text: resolveInlineText(choice.text, files, publicUrl) }))
  };
}
