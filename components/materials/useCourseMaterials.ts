"use client";
import { useEffect,useMemo,useState } from "react";
import { useStudentAccount } from "@/components/dashboard/StudentAccount";
import { createPageRequest } from "@/lib/pageRequest";
import { groupRequest } from "@/lib/groupApi";
import type { MaterialSummary } from "@/lib/courseMaterials";
import type { StudyGroup } from "@/lib/groups";
import type { LessonRow } from "@/lib/lessons";
export type MaterialsData={materials:MaterialSummary[];groups?:StudyGroup[];lessons?:LessonRow[];userId?:string};
export function useCourseMaterials(staff=false) {
  const {userId,isLoading}=useStudentAccount();
  const loader=useMemo(()=>createPageRequest(()=>userId?groupRequest<MaterialsData>(`/api/materials${staff?'?context=1':''}`,'GET',undefined,AbortSignal.timeout(15000)):Promise.reject(new Error('Sign in to view materials.'))),[userId,staff]);
  const [loaded,setLoaded]=useState<{owner:string;data:MaterialsData}|null>(null),[failure,setFailure]=useState<{owner:string;message:string}|null>(null),[retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!userId||isLoading)return;let active=true;
    loader.load().then(data=>{if(active){setLoaded({owner:userId,data});setFailure(null);}}).catch(error=>{if(active)setFailure({owner:userId,message:error instanceof Error?error.message:'Could not load materials.'});});
    return()=>{active=false;};
  },[userId,isLoading,loader,retry]);
  const data=loaded?.owner===userId?loaded?.data:null,error=failure?.owner===userId?failure?.message:null;
  return{data,error,loading:isLoading||Boolean(userId&&!data&&!error),signedOut:!isLoading&&!userId,userId,reload:()=>{loader.reset();setRetry(value=>value+1);}};
}
