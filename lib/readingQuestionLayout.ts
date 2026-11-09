/**
 * Legacy Reading & Writing questions store the passage and prompt together.
 * Split a recognizable final prompt, preserving the full source when ambiguous.
 */
const promptOpenings = [
  "(?:Based on|According to) (?:the|this) (?:two texts|texts?|table|data|graph|figure|passage|information|notes)",
  "As used in (?:the|this) text",
  "In the text, which",
  "Assuming participants",
  "The text makes which",
  "Information in the text best supports which",
  "It can most reasonably be inferred from the text that",
  "Taken together, the three underlined portions",
  "Which (?:choice|quotation|finding|statement|result|detail|option|piece|response|claim|observation|conclusion|research|scenario|sentence|information|question|survey response|completion)",
  "What (?:choice|can|does|did|is|was|would|reason|conclusion|finding|inference|feature)",
  "(?:How|Why) (?:does|did|do|would|can|is|might|could|are)"
];
const finalPrompt = new RegExp(String.raw`(?:^|\s)((?:${promptOpenings.join("|")})\b[^?]*\?)\s*$`, "u");

export function splitReadingQuestion(text: string) {
  const promptMatch = finalPrompt.exec(text);
  let passage = promptMatch ? text.slice(0, promptMatch.index).trimEnd() : text;

  if (/^Text 1\s/u.test(passage)) {
    passage = passage.replace(/^Text 1\s+/u, "Text 1\n").replace(/\s+Text 2\s+/u, "\n\nText 2\n");
  }

  return { passage, prompt: promptMatch?.[1] ?? "" };
}
