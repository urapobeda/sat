"use client";
import { Star } from "lucide-react";
import { useHardQuestions } from "@/components/hard-questions/HardQuestionsProvider";
export function HardQuestionButton({questionId}:{questionId:string}) {
  const state=useHardQuestions();
  if(!state)return null;
  const marked=state.items.find(item=>item.id===questionId)?.marked??false;
  return <span className="inline-flex flex-wrap items-center gap-2">
    <button type="button" aria-pressed={marked} title={state.signedOut?'Sign in to save Hard questions.':marked?'Remove your Hard mark':'Save to Hard questions'} disabled={state.loading||state.signedOut||state.busy.has(questionId)||Boolean(state.error)} onClick={()=>void state.setMarked(questionId,!marked)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 aria-pressed:border-amber-400 aria-pressed:bg-amber-50 aria-pressed:text-amber-800 disabled:cursor-default disabled:opacity-50"><Star size={16} aria-hidden="true" className={marked?'fill-amber-300':''} />Hard</button>
    {state.error?<button title={state.error} aria-label="Retry Hard questions" className="min-h-11 cursor-pointer text-xs text-amber-700 underline" type="button" onClick={state.reload}>Retry</button>:null}
  </span>;
}
