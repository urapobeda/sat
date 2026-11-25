/** Emphasize an existing contrast or quoted term without rewriting the explanation. */
export function explanationFocusPhrases(text: string): string[] {
  const phrases: string[] = [];
  const contrast = text.match(/\b(?:but\s+(?:here\s+)?(?:it|the\s+(?:text|passage))\s+(?:describes|means|refers to|suggests|shows)|rather than|instead of|does not|doesn't|fails to)\s+([^.;!?\n]{3,110})/i);
  const add = (raw: string) => {
    const phrase = raw.split(/\b(?:rather than|whereas|while)\b|, /i)[0].trim().split(/\s+/).slice(0,8).join(' ').replace(/[,;:]$/, '');
    if (phrase.length >= 3 && !/[\\$*<>\[\]]/.test(phrase) && !phrases.some(old => old.toLowerCase() === phrase.toLowerCase())) phrases.push(phrase);
  };
  if (contrast) add(contrast[1]);
  for (const quote of text.matchAll(/["“]([^"”\n]{3,70})["”]/g)) {
    if (phrases.length >= 2) break;
    add(quote[1]);
  }
  return phrases.slice(0,2);
}
