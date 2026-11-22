import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
let result={data:true,error:null};const calls=[];
globalThis.__liveRestrictionTest={read:()=>result,calls};
const mock="data:text/javascript;base64,"+Buffer.from(`export const getSupabaseAdminClient=()=>({rpc:async(name,args)=>{globalThis.__liveRestrictionTest.calls.push({name,args});return globalThis.__liveRestrictionTest.read();}});`).toString("base64");
const source=(await readFile(new URL("../lib/server/liveRestrictions.ts",import.meta.url),"utf8")).replace('import "server-only";',"").replace('"@/lib/supabase/admin"',JSON.stringify(mock));
const js=ts.transpileModule(source,{compilerOptions:{module:99,target:9}}).outputText;
const {isLiveQuestionRestricted}=await import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));
try {
  assert.equal(await isLiveQuestionRestricted("student","question"),true);
  assert.deepEqual(calls[0],{name:"question_in_active_live",args:{p_student:"student",p_question:"question"}});
  result={data:false,error:null};assert.equal(await isLiveQuestionRestricted("s","q"),false);
  result={data:null,error:{code:"PGRST202"}};assert.equal(await isLiveQuestionRestricted("s","q"),false);
  result={data:null,error:{code:"42501"}};await assert.rejects(isLiveQuestionRestricted("s","q"),/could not be verified/);
  console.log("Live restriction tests passed: embargo, inactive questions, pre-migration compatibility and fail-closed permission errors.");
} finally {delete globalThis.__liveRestrictionTest;}
