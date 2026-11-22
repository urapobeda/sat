import { NextResponse,type NextRequest } from "next/server";
import { z } from "zod";
import { materialActor,materialError } from "@/lib/server/materialAccess";
export async function GET(request:NextRequest,context:{params:Promise<{materialId:string}>}) {
  const actor=await materialActor(request);
  if(!actor)return NextResponse.json({error:'Sign in to read this material.'},{status:401});
  const {materialId}=await context.params;
  if(!z.uuid().safeParse(materialId).success)return NextResponse.json({error:'Material not found.'},{status:404});
  try {
    const result=await actor.db.from('course_materials').select('*').eq('id',materialId).maybeSingle();
    if(result.error)throw result.error;
    return NextResponse.json(result.data?{material:result.data}:{error:'Material not found or not published.'},{status:result.data?200:404,headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return materialError(error);}
}
