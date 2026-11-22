import { NextResponse,type NextRequest } from "next/server";
import { z } from "zod";
import { materialActor,materialError } from "@/lib/server/materialAccess";
import { allLessonRows } from "@/lib/server/lessonAccess";
export async function GET(request:NextRequest) {
  const actor=await materialActor(request);
  if(!actor)return NextResponse.json({error:'Sign in to save Hard questions.'},{status:401});
  try {
    const rows=await allLessonRows((from,to)=>actor.db.rpc('list_my_hard_questions').range(from,to));
    return NextResponse.json({items:rows.map(row=>({...row,id:row.question_id}))},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return materialError(error);}
}
export async function POST(request:NextRequest) {
  const actor=await materialActor(request);
  if(!actor)return NextResponse.json({error:'Sign in to save Hard questions.'},{status:401});
  const body=z.object({questionId:z.uuid(),marked:z.boolean()}).safeParse(await request.json().catch(()=>null));
  if(!body.success)return NextResponse.json({error:'Invalid question.'},{status:400});
  try {
    const {questionId,marked}=body.data;
    const result=marked?await actor.db.from('student_question_flags').upsert({student_id:actor.actor.id,question_id:questionId},{onConflict:'student_id,question_id',ignoreDuplicates:true}):await actor.db.from('student_question_flags').delete().eq('student_id',actor.actor.id).eq('question_id',questionId);
    if(result.error)throw result.error;
    const saved=await actor.db.rpc('list_my_hard_questions',{p_question:questionId});
    if(saved.error)throw saved.error;
    const row=saved.data?.[0];
    return NextResponse.json({item:row?{...row,id:row.question_id}:null});
  }catch(error){return materialError(error);}
}
