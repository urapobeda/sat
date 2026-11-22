"use client";
// Temporary local rendering fixture. Removed after browser QA; no database writes.
import {useState} from 'react';
import {CourseTabs} from '@/components/course/CourseTabs';
import {MaterialMarkdown} from '@/components/materials/MaterialMarkdown';
import {QuestionHighlightControls,useQuestionHighlight} from '@/components/quiz/QuestionHighlight';
import {Highlightable} from '@/components/quiz/Highlightable';
import {VocabularySelection} from '@/components/vocabulary/VocabularySelection';
import {VocabularyContext} from '@/components/vocabulary/VocabularyProvider';
import {vocabularyIndex} from '@/lib/vocabulary';
const index=vocabularyIndex([{id:'fixture',group_id:null,lesson_id:null,created_by:'fixture',word:'infer',part_of_speech:'verb',definition_en:'Reach a conclusion from evidence.',translation_ru:'Meaning from the course vocabulary',example:'We infer the result.',created_at:'',updated_at:''}]);
const initial='# Reading with evidence\n\nStudents infer a conclusion from the passage. Select **infer** to look up its meaning.\n\n## A mathematical note\n\nThe expression $x^2 + 2x + 1$ equals $(x+1)^2$.\n\n$$\\frac{1}{2} + \\frac{1}{4} = \\frac{3}{4}$$\n\n| Skill | Focus |\n|---|---|\n| Reading | Evidence |\n| Math | Algebra |\n\n[Course resources](https://example.com)\n\n<script>alert("not rendered")</script>';
export default function Preview(){const highlight=useQuestionHighlight();const [body,setBody]=useState(initial);return <main className="mx-auto min-w-0 max-w-5xl space-y-5 p-4 sm:p-7"><CourseTabs active="texts"/><p className="text-xs text-slate-500">Local preview fixture · no student data</p><article className="hub-card min-w-0 space-y-5 p-5 sm:p-8"><header className="flex flex-wrap items-start justify-between gap-4"><h1 className="text-2xl font-bold">Course text preview</h1><QuestionHighlightControls {...highlight}/></header><VocabularyContext.Provider value={{status:'ready',index,retry:()=>{}}}><VocabularySelection enabled={!highlight.highlightEnabled} scopeKey="materials-qa"><Highlightable enabled={highlight.highlightEnabled} tool={highlight.highlightTool} storageKey="materials-qa"><MaterialMarkdown body={body}/></Highlightable></VocabularySelection></VocabularyContext.Provider></article><label className="block text-sm">Markdown preview input<textarea className="mt-2 min-h-40 w-full rounded-xl border p-3 font-mono text-sm" value={body} onChange={e=>setBody(e.target.value)}/></label></main>;}
