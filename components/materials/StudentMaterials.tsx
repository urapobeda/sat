"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { useStudentAccount } from "@/components/dashboard/StudentAccount";
import { CourseTabs } from "@/components/course/CourseTabs";
import { VocabularyProvider } from "@/components/vocabulary/VocabularyProvider";
import { VocabularySelection } from "@/components/vocabulary/VocabularySelection";
import { Highlightable } from "@/components/quiz/Highlightable";
import { QuestionHighlightControls,useQuestionHighlight } from "@/components/quiz/QuestionHighlight";
import { MaterialMarkdown } from "@/components/materials/MaterialMarkdown";
import { useCourseMaterials } from "@/components/materials/useCourseMaterials";
import { groupRequest } from "@/lib/groupApi";
import { MATERIAL_SECTIONS,safeMaterialUrl,type CourseMaterial } from "@/lib/courseMaterials";

export function CourseMaterialsList({useful=false,all=false,heading}:{useful?:boolean;all?:boolean;heading?:string}) {
  const state=useCourseMaterials();const [search,setSearch]=useState(''),[section,setSection]=useState('all'),[lesson,setLesson]=useState('');
  const materials=state.data?.materials.filter(item=>all||(useful?item.kind!=='text':item.kind==='text'))??[];
  const visible=materials.filter(item=>(section==='all'||item.section===section)&&(!lesson||item.lesson_id===lesson)&&item.title.toLowerCase().includes(search.toLowerCase().trim()));
  const lessons=[...new Map(materials.flatMap(item=>item.lesson_id&&item.lesson_title?[[item.lesson_id,item.lesson_title] as const]:[])).entries()];
  return <section className="min-w-0 space-y-4">{heading?<h2 className="text-xl font-semibold">{heading}</h2>:null}
    {state.signedOut?<p><Link href="/auth?next=/course/texts" className="hub-text-link">Sign in</Link> to view your teachers’ materials.</p>:state.loading?<p role="status">Loading materials…</p>:<>
      {state.error?<p role="alert" className="text-sm text-amber-700">{state.error} <button className="min-h-11 cursor-pointer underline" onClick={state.reload}>Retry</button></p>:null}
      <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Search<input className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3" type="search" maxLength={200} value={search} onChange={event=>setSearch(event.target.value)} /></label><label className="text-sm">Section<select className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3" value={section} onChange={event=>setSection(event.target.value)}><option value="all">All sections</option>{Object.entries(MATERIAL_SECTIONS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label className="text-sm">Lesson<select className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3" value={lesson} onChange={event=>setLesson(event.target.value)}><option value="">All lessons</option>{lessons.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label></div>
      {!visible.length?<p className="hub-card p-6 text-slate-500">{state.error?'Materials are temporarily unavailable.':materials.length?'No materials match your filters.':'Your teacher has not published materials here yet.'}</p>:<div className="grid gap-4 sm:grid-cols-2">{visible.map(item=><article className="hub-card min-w-0 space-y-3 p-5" key={item.id}><p className="text-xs text-slate-500">{MATERIAL_SECTIONS[item.section]} · {item.group_name??'Common material'}{item.lesson_title?` · ${item.lesson_title}`:''}</p><h2 className="break-words text-lg font-semibold">{item.title}</h2>{item.kind==='link'?safeMaterialUrl(item.url)?<a className="hub-text-link inline-flex min-h-11 items-center" href={safeMaterialUrl(item.url)} target="_blank" rel="noopener noreferrer">Open link ↗</a>:<p className="text-sm text-slate-500">This link is unavailable.</p>:<Link className="hub-primary inline-flex min-h-11 items-center" href={`/course/texts/${item.id}`}>{item.kind==='text'?'Read text':'Read note'}</Link>}</article>)}</div>}
    </>}
  </section>;
}
export function StudentMaterialsPage({useful=false}:{useful?:boolean}) {
  return <StudentShell active="course"><main className="mx-auto min-w-0 max-w-6xl space-y-5 p-4 sm:p-7"><CourseTabs active={useful?'useful':'texts'} /><header><h1 className="text-3xl font-bold">{useful?'Useful':'Texts'}</h1><p className="mt-2 text-slate-500">{useful?'Notes and links shared by your teachers.':'Read course texts, highlight passages, and look up words in your course vocabulary.'}</p></header><CourseMaterialsList useful={useful} /></main></StudentShell>;
}
export function MaterialReaderPage({materialId}:{materialId:string}) {
  return <StudentShell active="course"><MaterialReader materialId={materialId} /></StudentShell>;
}
function MaterialReader({materialId}:{materialId:string}) {
  const {userId,isLoading}=useStudentAccount();const [loaded,setLoaded]=useState<{owner:string;material:CourseMaterial}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const highlight=useQuestionHighlight();
  useEffect(()=>{
    if(!userId||isLoading)return;const controller=new AbortController();
    groupRequest<{material:CourseMaterial}>(`/api/materials/${materialId}`,'GET',undefined,AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]))
      .then(data=>{if(!controller.signal.aborted){setLoaded({owner:userId,material:data.material});setError('');}})
      .catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Could not load this material.');});
    return()=>controller.abort();
  },[materialId,userId,isLoading,retry]);
  const material=loaded?.owner===userId&&loaded?.material.id===materialId?loaded.material:null;
  const active=material&&material.kind!=='text'?'useful':'texts';
  return <main className="mx-auto min-w-0 max-w-4xl space-y-5 p-4 sm:p-7"><CourseTabs active={active} /><Link className="hub-text-link text-sm" href={active==='texts'?'/course/texts':'/course/useful'}>← Back to {active==='texts'?'texts':'useful'}</Link>
    {isLoading?<p role="status">Loading account…</p>:!userId?<p><Link className="hub-text-link" href={`/auth?next=${encodeURIComponent(`/course/texts/${materialId}`)}`}>Sign in</Link> to read this material.</p>:error?<p role="alert" className="text-sm text-amber-700">{error} <button className="min-h-11 cursor-pointer underline" onClick={()=>setRetry(value=>value+1)}>Retry</button></p>:!material?<p role="status">Loading material…</p>:null}
    {userId&&material?<VocabularyProvider><article className="hub-card min-w-0 space-y-5 p-5 sm:p-8"><header className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs text-slate-500">{MATERIAL_SECTIONS[material.section]}{!material.published?' · Draft preview':''}</p><h1 className="mt-2 break-words text-3xl font-bold">{material.title}</h1></div><QuestionHighlightControls {...highlight} /></header>
      {material.kind==='link'?<a className="hub-text-link" href={safeMaterialUrl(material.url)||undefined} target="_blank" rel="noopener noreferrer">Open link ↗</a>:null}
      <VocabularySelection enabled={!highlight.highlightEnabled} scopeKey={`material-${material.id}-${material.updated_at}`}><Highlightable enabled={highlight.highlightEnabled} tool={highlight.highlightTool} storageKey={`material-${material.id}-${material.updated_at}`}><MaterialMarkdown body={material.body} /></Highlightable></VocabularySelection>
    </article></VocabularyProvider>:null}
  </main>;
}
export function CoursePracticeTestsPage() {
  return <StudentShell active="course"><main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-7"><CourseTabs active="tests" /><h1 className="text-3xl font-bold">Practice tests</h1><div className="grid gap-4 sm:grid-cols-2"><Link href="/tests" className="hub-card space-y-2 p-6"><h2 className="text-xl font-semibold">Practice tests →</h2><p className="text-slate-500">Timed practice and your saved test attempts.</p></Link><Link href="/past-papers" className="hub-card space-y-2 p-6"><h2 className="text-xl font-semibold">Past papers →</h2><p className="text-slate-500">Browse and complete interactive papers.</p></Link></div></main></StudentShell>;
}
