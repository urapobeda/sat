import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { selectedVocabularyWord } from "@/lib/vocabulary";

export const vocabularyScope = { groupId: z.uuid().nullable(), lessonId: z.uuid().nullable() };
export const vocabularySchema = z.object({ ...vocabularyScope,
  word: z.string().trim().min(1).max(100).refine(word => selectedVocabularyWord(word) === word),
  partOfSpeech: z.string().trim().max(80), definitionEn: z.string().trim().min(1).max(4000),
  translationRu: z.string().trim().min(1).max(1000), example: z.string().trim().max(4000)
});
export function vocabularyValues(value: z.infer<typeof vocabularySchema>) {
  return { group_id: value.groupId, lesson_id: value.lessonId, word: value.word, part_of_speech: value.partOfSpeech,
    definition_en: value.definitionEn, translation_ru: value.translationRu, example: value.example };
}
export function vocabularyError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const status = code === "42501" ? 403 : code === "23505" ? 409 : ["22023", "23514", "23503", "23502"].includes(code) ? 400 : 503;
  return NextResponse.json({ error: status === 403 ? "You do not have access to this vocabulary." : status === 409 ? "This word already exists in the selected vocabulary." : status === 400 ? "Check the word fields, group and lesson." : "Vocabulary could not be loaded or saved. Please try again." }, { status });
}
