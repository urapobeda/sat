"use client";
// Temporary local browser fixture; removed before delivery.
import { useState } from "react";
import { VocabularyContext } from "@/components/vocabulary/VocabularyProvider";
import { VocabularySelection } from "@/components/vocabulary/VocabularySelection";
import { vocabularyIndex, type VocabularyWord } from "@/lib/vocabulary";
import { QuestionHighlightControls, useQuestionHighlight } from "@/components/quiz/QuestionHighlight";
import { Highlightable } from "@/components/quiz/Highlightable";
const words = [{ id: "fixture", word: "infer", part_of_speech: "verb", definition_en: "Reach a conclusion from evidence and reasoning.", translation_ru: "Translation fixture", example: "We can infer the result.", group_name: "QA group" }] as VocabularyWord[];
const index = vocabularyIndex(words);
export default function Page() {
  const highlight = useQuestionHighlight();
  const [question, setQuestion] = useState(1); const [answer, setAnswer] = useState("");
  return <main className="mx-auto min-h-dvh max-w-3xl space-y-8 p-6 pt-48">
    <VocabularyContext.Provider value={{ status: "ready", index, retry: () => undefined }}>
      <h1 className="text-2xl font-bold">Local vocabulary QA</h1>
      <QuestionHighlightControls {...highlight} />
      <VocabularySelection enabled={!highlight.highlightEnabled} scopeKey={String(question)}>
        <Highlightable enabled={highlight.highlightEnabled} tool={highlight.highlightTool} storageKey="vocabulary-local-qa"><p className="text-xl leading-9">{question === 1 ? "Students inferred conclusions from evidence. Unknown words remain selectable." : "Students infer a conclusion. This is the next question."}</p></Highlightable>
      </VocabularySelection>
      <button className="min-h-11 rounded-lg border px-4" onClick={() => setAnswer("A")}>A · Select answer</button><p>Selected: {answer || "none"}</p>
      <button className="min-h-11 rounded-lg bg-blue-600 px-4 text-white" onClick={() => setQuestion(q => q + 1)}>Next question</button>
      <p className="min-h-[800px]">Question {question}</p>
    </VocabularyContext.Provider>
  </main>;
}
