export type VocabularyRecord = {
  id: string; group_id: string | null; lesson_id: string | null; created_by: string;
  word: string; part_of_speech: string; definition_en: string; translation_ru: string;
  example: string; created_at: string; updated_at: string;
};
export type VocabularyWord = VocabularyRecord & { group_name: string | null; lesson_title: string | null };
export type VocabularyImportRow = Pick<VocabularyRecord, "word" | "translation_ru" | "definition_en">;

export function selectedVocabularyWord(value: string): string | null {
  const word = value.normalize("NFKC").trim().replace(/[’‘]/g, "'")
    .replace(/^[.,!?;:()…"'“”]+|[.,!?;:()…"'“”]+$/gu, "");
  return word.length <= 100 && /^[\p{L}]+(?:['-][\p{L}]+)*$/u.test(word) ? word : null;
}
export function wordKey(word: string) { return word.normalize("NFKC").replace(/[’‘]/g, "'").toLowerCase(); }
export function vocabularyCandidates(word: string): string[] {
  const result = new Set([wordKey(word)]);
  function strip(value: string) {
    if (value.length < 4) return;
    if (/(ies|ied)$/.test(value)) result.add(value.slice(0, -3) + "y");
    if (/s$/.test(value) && !/ss$/.test(value)) result.add(value.slice(0, -1));
    if (/es$/.test(value)) result.add(value.slice(0, -2));
    const suffix = /ing$/.test(value) && value.length > 5 ? 3 : /ed$/.test(value) ? 2 : 0;
    if (suffix) {
      const stem = value.slice(0, -suffix);
      result.add(stem); result.add(stem + "e");
      if (/([bcdfghjklmnpqrstvwxyz])\1$/.test(stem)) result.add(stem.slice(0, -1));
    }
  }
  strip(wordKey(word));
  // Inflected plurals such as "paintings" can need one further step.
  for (const candidate of [...result]) if (candidate !== wordKey(word)) strip(candidate);
  return [...result];
}
export function vocabularyIndex(words: VocabularyWord[]) {
  const index = new Map<string, VocabularyWord[]>();
  for (const word of words) {
    const key = wordKey(word.word);
    index.set(key, [...index.get(key) ?? [], word]);
  }
  return index;
}
export function lookupVocabulary(index: Map<string, VocabularyWord[]>, word: string) {
  for (const key of vocabularyCandidates(word)) { const found = index.get(key); if (found) return found; }
  return [];
}
export function parseVocabularyImport(text: string): VocabularyImportRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const rows: VocabularyImportRow[] = []; const seen = new Set<string>();
  for (const [i, raw] of lines.entries()) {
    if (!raw.trim()) continue;
    const parts = raw.trim().split(/\s+[—–-]\s+/);
    const [word, translation, ...definition] = parts;
    const definitionEn = definition.join(" — ").trim();
    if (!word || selectedVocabularyWord(word) !== word || !translation?.trim() || !definitionEn || translation.length > 1000 || definitionEn.length > 4000)
      throw new Error(`Line ${i + 1}: use word — translation — definition (one word per line).`);
    if (seen.has(wordKey(word))) throw new Error(`Line ${i + 1}: this word is repeated in the import.`);
    seen.add(wordKey(word)); rows.push({ word, translation_ru: translation.trim(), definition_en: definitionEn });
  }
  if (!rows.length || rows.length > 500) throw new Error("Paste between 1 and 500 words.");
  return rows;
}
export function createVocabularyPageLoader<T>(read: () => Promise<T>) {
  let pending: Promise<T> | undefined;
  return { load: () => pending ??= read(), retry: () => { pending = undefined; } };
}
export function vocabularyPosition(anchor: { top: number; bottom: number; left: number; right: number }, width: number, height: number, viewportWidth: number, viewportHeight: number) {
  return { left: Math.max(12, Math.min((anchor.left + anchor.right - width) / 2, viewportWidth - width - 12)),
    top: Math.max(12, Math.min(anchor.top - height - 10 >= 12 ? anchor.top - height - 10 : anchor.bottom + 10, viewportHeight - height - 12)) };
}
