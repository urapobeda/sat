import { NextResponse,type NextRequest } from "next/server";
import { z } from "zod";
import { getGroupStaff } from "@/lib/server/groupAccess";
import { materialSchema,materialValues,materialError } from "@/lib/server/materialAccess";
type Context={params:Promise<{materialId:string}>};
export async function PATCH(request:NextRequest,context:Context) {
  const staff=await getGroupStaff(request);
  if(!staff)return NextResponse.json({error:'Forbidden'},{status:403});
  const {materialId}=await context.params;const raw=await request.json().catch(()=>null);
  const publish=z.object({action:z.literal('publish'),published:z.boolean()}).safeParse(raw);
  const body=materialSchema.safeParse(raw);
  if(!z.uuid().safeParse(materialId).success||(!publish.success&&!body.success))return NextResponse.json({error:'Check the material fields.'},{status:400});
  try {
    const result=await staff.db.from('course_materials').update(publish.success?{published:publish.data.published}:materialValues(body.data!)).eq('id',materialId).select('id').maybeSingle();
    if(result.error)throw result.error;
    return NextResponse.json(result.data??{error:'Material not found.'},{status:result.data?200:404});
  }catch(error){return materialError(error);}
}
export async function DELETE(request:NextRequest,context:Context) {
  const staff=await getGroupStaff(request);
  if(!staff)return NextResponse.json({error:'Forbidden'},{status:403});
  const {materialId}=await context.params;
  if(!z.uuid().safeParse(materialId).success)return NextResponse.json({error:'Invalid material.'},{status:400});
  try {
    const result=await staff.db.from('course_materials').delete().eq('id',materialId).select('id').maybeSingle();
    if(result.error)throw result.error;
    return NextResponse.json(result.data??{error:'Material not found.'},{status:result.data?200:404});
  }catch(error){return materialError(error);}
}
