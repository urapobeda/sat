"use client";
import Link from "next/link";
import { useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { CourseTabs } from "@/components/course/CourseTabs";
import { HardQuestionsProvider,useHardQuestions } from "@/components/hard-questions/HardQuestionsProvider";
import { HardQuestionButton } from "@/components/hard-questions/HardQuestionButton";
import { hardPracticeHref,hardQuestionMatches } from "@/lib/hardQuestions";
export function HardQuestionsPage(){return <StudentShell active="course"><HardQuestionsProvider><HardQuestionsContent /></HardQuestionsProvider></StudentShell>;}
function HardQuestionsContent() {
  const state=useHardQuestions()!;const [section,setSection]=useState('all'),[search,setSearch]=useState('');
  const [selected,setSelected]=useState<Set<string>>(()=>new Set());
  const visible=state.items.filter(item=>hardQuestionMatches(item,section,search));
  const selectedIds=state.items.filter(item=>selected.has(item.id)).map(item=>item.id);
  return <main className="mx-auto min-w-0 max-w-6xl space-y-5 p-4 sm:p-7"><CourseTabs active="hard" />
    <header><h1 className="text-3xl font-bold">Hard questions</h1><p className="mt-2 text-slate-500">Your saved questions and questions with two or more saved incorrect attempts. Results that are still hidden by your teacher are excluded.</p></header>
    {state.signedOut?<p><Link className="hub-text-link" href="/auth?next=/course/hard-questions">Sign in</Link> to view your Hard questions.</p>:state.loading?<p role="status">Loading Hard questions…</p>:<>
      {state.error?<p role="alert" className="text-amber-700">{state.error} <button className="min-h-11 underline" onClick={state.reload}>Retry</button></p>:null}
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Search<input className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3" type="search" maxLength={200} value={search} onChange={event=>setSearch(event.target.value)} /></label><label className="text-sm">Section<select className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3" value={section} onChange={event=>setSection(event.target.value)}><option value="all">All sections</option><option value="math">Math</option><option value="reading-writing">Reading & Writing</option></select></label></div>
      <div className="flex flex-wrap items-center gap-3">{visible.length?<Link className="hub-primary min-h-11" href={hardPracticeHref(undefined,section,search)}>Practice all · {visible.length}</Link>:null}{selectedIds.length?<Link className="hub-primary min-h-11" href={hardPracticeHref(selectedIds)}>Practice selected · {selectedIds.length}</Link>:null}<p className="text-sm text-slate-500">Select up to 100 questions.</p></div>
      {!visible.length?<p className="hub-card p-6 text-slate-500">{state.error?'Your saved questions are temporarily unavailable.':state.items.length?'No questions match these filters.':'No Hard questions yet. Use Hard in practice or homework to save one.'}</p>:<div className="space-y-3">{visible.map(item=><article className="hub-card flex min-w-0 gap-3 p-4" key={item.id}><input type="checkbox" className="mt-1 size-5 shrink-0 cursor-pointer accent-blue-600" aria-label={`Select ${item.topic} question`} checked={selected.has(item.id)} disabled={!selected.has(item.id)&&selectedIds.length>=100} onChange={event=>setSelected(old=>{const next=new Set(old);if(event.target.checked)next.add(item.id);else next.delete(item.id);return next;})} /><div className="min-w-0 flex-1 space-y-2"><p className="text-sm font-medium">{item.section==='math'?'Math':'Reading & Writing'} · {item.topic} · {item.difficulty}</p><p className="break-words text-sm text-slate-500">{item.preview}</p><p className="text-xs text-slate-500">{item.marked?'Personally marked':''}{item.marked&&item.mistake_count>=2?' · ':''}{item.mistake_count>=2?`${item.mistake_count} incorrect attempts`:''}</p><HardQuestionButton questionId={item.id} /></div><Link className="hub-text-link self-start text-sm" href={hardPracticeHref([item.id])}>Practice</Link></article>)}</div>}
    </>}
  </main>;
}
