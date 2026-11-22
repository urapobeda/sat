import { NextResponse,type NextRequest } from "next/server";
import { materialActor,materialError } from "@/lib/server/materialAccess";
import { allLessonRows } from "@/lib/server/lessonAccess";
export async function GET(request:NextRequest) {
  const actor=await materialActor(request);
  if(!actor)return NextResponse.json({error:'Sign in to view course materials.'},{status:401});
  const context=request.nextUrl.searchParams.get('context')==='1';
  if(context&&actor.actor.role==='student')return NextResponse.json({error:'Forbidden'},{status:403});
  try {
    const [materials,groups,lessons]=await Promise.all([
      allLessonRows((from,to)=>actor.db.rpc('list_course_materials').range(from,to)),
      context?allLessonRows((from,to)=>actor.db.rpc('list_my_groups').range(from,to)):[],
      context?allLessonRows((from,to)=>actor.db.rpc('list_my_lessons').range(from,to)):[]
    ]);
    return NextResponse.json({materials,...(context?{groups,lessons,userId:actor.actor.id}:{})},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return materialError(error);}
}
