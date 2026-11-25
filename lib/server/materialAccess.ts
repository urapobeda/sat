import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiRoleActor } from "@/lib/server/roles";
import { getSupabaseUserClient } from "@/lib/server/userClient";
import { safeMaterialUrl } from "@/lib/courseMaterials";
export const materialSchema = z.object({
  groupId:z.uuid().nullable(),lessonId:z.uuid().nullable(),kind:z.enum(["text","note","link"]),title:z.string().trim().min(1).max(200),
  section:z.enum(["math","reading_writing","general"]),body:z.string().max(100000),url:z.string().trim().max(2048),
  position:z.number().int().min(1).max(100000),published:z.boolean()
}).refine(value=>value.kind==='link'?Boolean(safeMaterialUrl(value.url)):Boolean(value.body.trim())&&value.url==='');
export function materialValues(value:z.infer<typeof materialSchema>) {
  return {group_id:value.groupId,lesson_id:value.lessonId,kind:value.kind,title:value.title,section:value.section,body:value.body,
    url:value.kind==='link'?safeMaterialUrl(value.url):'',position:value.position,published:value.published};
}
export async function materialActor(request:NextRequest) {
  const actor=await getApiRoleActor(request);
  return actor?{actor,db:getSupabaseUserClient(request.headers.get("authorization")!.slice(7))}:null;
}
export function materialError(error:unknown) {
  const code=typeof error==='object'&&error!==null&&'code' in error?String(error.code):'';
  const status=code==='42501'?403:['22023','23514','23503','23502'].includes(code)?400:503;
  return NextResponse.json({error:status===403?'You do not have access to this material.':status===400?'Check the material fields, link, group and lesson.':'Materials could not be loaded or saved. Please try again.'},{status});
}
