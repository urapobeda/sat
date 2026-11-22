import { NextResponse,type NextRequest } from "next/server";
import { getGroupStaff } from "@/lib/server/groupAccess";
import { materialSchema,materialValues,materialError } from "@/lib/server/materialAccess";
export async function POST(request:NextRequest) {
  const staff=await getGroupStaff(request);
  if(!staff)return NextResponse.json({error:'Forbidden'},{status:403});
  const body=materialSchema.safeParse(await request.json().catch(()=>null));
  if(!body.success)return NextResponse.json({error:'Enter a title, content or a valid HTTP/HTTPS link.'},{status:400});
  try {
    const result=await staff.db.from('course_materials').insert({...materialValues(body.data),created_by:staff.actor.id}).select('id').single();
    if(result.error)throw result.error;
    return NextResponse.json(result.data,{status:201});
  }catch(error){return materialError(error);}
}
