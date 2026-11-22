"use client";
import { createContext,useContext,useEffect,useMemo,useRef,useState,type ReactNode } from "react";
import { useStudentAccount } from "@/components/dashboard/StudentAccount";
import { createPageRequest } from "@/lib/pageRequest";
import { groupRequest } from "@/lib/groupApi";
import type { HardQuestion } from "@/lib/hardQuestions";
type State={items:HardQuestion[];loading:boolean;signedOut:boolean;error:string|null;busy:Set<string>;setMarked:(id:string,marked:boolean)=>Promise<void>;reload:()=>void};
const Context=createContext<State|null>(null);
export const useHardQuestions=()=>useContext(Context);
export function HardQuestionsProvider({children}:{children:ReactNode}) {
  const {userId}=useStudentAccount();
  return <HardQuestionsAccount key={userId??'guest'}>{children}</HardQuestionsAccount>;
}
function HardQuestionsAccount({children}:{children:ReactNode}) {
  const {userId,isLoading}=useStudentAccount();
  const active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const loader=useMemo(()=>createPageRequest(()=>userId?groupRequest<{items:HardQuestion[]}>('/api/hard-questions','GET',undefined,AbortSignal.timeout(15000)):Promise.reject(new Error('Sign in to save Hard questions.'))),[userId]);
  const [loaded,setLoaded]=useState<{owner:string;items:HardQuestion[]}|null>(null);
  const [failure,setFailure]=useState<{owner:string;message:string}|null>(null);
  const [busy,setBusy]=useState<Set<string>>(()=>new Set());const [retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!userId||isLoading)return;let active=true;
    loader.load().then(data=>{if(active){setLoaded({owner:userId,items:data.items});setFailure(null);}}).catch(error=>{if(active)setFailure({owner:userId,message:error instanceof Error?error.message:'Hard questions could not be loaded.'});});
    return()=>{active=false;};
  },[userId,isLoading,loader,retry]);
  const items=loaded?.owner===userId?loaded?.items??[]:[];
  const error=failure?.owner===userId?failure?.message??null:null;
  async function setMarked(id:string,marked:boolean) {
    if(!userId||busy.has(id))return;
    setBusy(old=>new Set(old).add(id));
    try {
      const result=await groupRequest<{item:HardQuestion|null}>('/api/hard-questions','POST',{questionId:id,marked},AbortSignal.timeout(15000));
      if(!active.current)return;
      setLoaded(old=>{const others=old?.owner===userId?old.items.filter(item=>item.id!==id):[];return {owner:userId,items:result.item?[...others,result.item]:others};});setFailure(null);
    }catch(error){if(active.current)setFailure({owner:userId,message:error instanceof Error?error.message:'The Hard mark could not be saved.'});}
    finally{if(active.current)setBusy(old=>{const next=new Set(old);next.delete(id);return next;});}
  }
  return <Context.Provider value={{items,loading:isLoading||Boolean(userId&&!loaded&&!error),signedOut:!isLoading&&!userId,error,busy,setMarked,reload:()=>{loader.reset();setRetry(value=>value+1);}}}>{children}</Context.Provider>;
}
