/** Extract only an explicitly incorrect choice's rationale, never the full solution. */
export function incorrectChoiceExplanation(explanation: string, selectedAnswer: string, correctLabel: string | null) {
  const selected = selectedAnswer.trim().toUpperCase();
  if (!/^[A-D]$/.test(selected) || selected === correctLabel?.toUpperCase()) return null;
  const markers = [...explanation.matchAll(/\bChoices?\s+([A-D](?:(?:\s*,\s*(?:and\s+)?|\s+and\s+|\s*&\s*)[A-D])*)\s+(?:is|are)\s+/gi)];
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const labels: string[] = marker[1].toUpperCase().match(/\b[A-D]\b/g) ?? [];
    if (!labels.includes(selected) || (correctLabel && labels.includes(correctLabel.toUpperCase()))) continue;
    const start = marker.index! + marker[0].length;
    const section = explanation.slice(start, markers[i + 1]?.index ?? explanation.length).trim();
    if (!/^incorrect\b/i.test(section)) continue;
    const body = section.replace(/^incorrect\b[.:]?\s*/i, '').trim();
    // Fail closed for malformed/combined solutions, answer-key references, and image-only explanations.
    if (!body || body.length > 4000 || /\b(?:correct|best)\s+answer\b|\[\[img:|<img\b/i.test(body)) continue;
    if (correctLabel && new RegExp(`\\b(?:choice|option)\\s+${correctLabel}\\b`, 'i').test(body)) continue;
    return /^because\b/i.test(body) ? `This choice is incorrect ${body}` : body;
  }
  return null;
}
