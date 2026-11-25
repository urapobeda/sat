"use client";
import Link from "next/link";
import { useEffect,useRef } from "react";
export const COURSE_TABS = [
  ["plan","Course plan","/course"],["homework","Homework","/homework"],["vocabulary","Vocabulary","/vocabulary"],
  ["texts","Texts","/course/texts"],["hard","Hard questions","/course/hard-questions"],
  ["tests","Practice tests","/course/practice-tests"],["useful","Useful","/course/useful"]
] as const;
export type CourseTab = typeof COURSE_TABS[number][0];
export function CourseTabs({active}:{active:CourseTab}) {
  const current=useRef<HTMLAnchorElement>(null);
  useEffect(()=>{current.current?.scrollIntoView({block:'nearest',inline:'center'});},[active]);
  return <nav aria-label="Course navigation" className="flex min-w-0 gap-1 overflow-x-auto border-b border-slate-200 pb-1">
    {COURSE_TABS.map(([id,label,href])=><Link key={id} href={href} ref={id===active?current:undefined} aria-current={id===active?'page':undefined} className="min-h-11 shrink-0 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 aria-[current=page]:bg-blue-50 aria-[current=page]:text-blue-700">{label}</Link>)}
  </nav>;
}
