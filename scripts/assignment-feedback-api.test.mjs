import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const assignment = "00000000-0000-4000-8000-000000000001";
const student = "00000000-0000-4000-8000-000000000002";
const submission = "00000000-0000-4000-8000-000000000003";
const teacher = "00000000-0000-4000-8000-000000000004";
const context = { z: require("zod").z, role: "teacher", owned: true, status: "submitted", calls: [] };
globalThis.__satFeedbackTest = context;
const mock = `
const c=globalThis.__satFeedbackTest;
export const z=c.z;
export const NextResponse={json:(body,init)=>Response.json(body,init)};
export function homeworkError(error){return Response.json({error:'Unavailable'},{status:error.code==='42501'?403:503});}
export async function getHomeworkStaff(){return !c.role||c.role==='student'?null:{actor:{id:'${teacher}',role:c.role},db:{
  from(table){c.calls.push(['from',table]);return{
    select(){return this;},eq(k,v){c.calls.push(['eq',k,v]);return this;},
    async maybeSingle(){return{data:c.owned?{id:'${submission}',status:c.status}:null,error:null};},
    insert(row){c.calls.push(['insert',row]);return this;},async single(){return{data:{id:'fixture',body:'Comment'},error:null};}
  };},
  async rpc(name,args){c.calls.push(['rpc',name,args]);return{data:1,error:null};}
}};}
export async function loadAssignmentReport(staff,id){c.calls.push(['report',id]);if(!c.owned)throw{code:'42501'};return{rows:[],summary:{}};}
export async function loadStudentWork(staff,id,sid,attempt){c.calls.push(['work',id,sid,attempt]);if(!c.owned)throw{code:'42501'};return{submission:null};}
`;
const mockUrl="data:text/javascript;base64,"+Buffer.from(mock).toString("base64");
async function load(path){const source=(await readFile(new URL(path,import.meta.url),"utf8")).replace(/from "[^"]+"/g,`from "${mockUrl}"`);return import("data:text/javascript;base64,"+Buffer.from(require("typescript").transpileModule(source,{compilerOptions:{module:99,target:9}}).outputText).toString("base64"));}
const request=(body={})=>({json:async()=>body,nextUrl:new URL("http://localhost/"),headers:new Headers()});
const params={params:Promise.resolve({assignmentId:assignment,studentId:student})};
try{
  const report=await load("../app/api/teacher/homework/[assignmentId]/report/route.ts");
  const work=await load("../app/api/teacher/homework/[assignmentId]/student/[studentId]/route.ts");
  for(const role of [null,"student"]){context.role=role;assert.equal((await report.GET(request(),params)).status,403);assert.equal((await work.GET(request(),params)).status,403);assert.equal((await work.POST(request(),params)).status,403);}
  context.role="teacher";context.owned=false;
  assert.equal((await report.GET(request(),params)).status,403);
  assert.equal((await work.GET(request(),params)).status,403);
  assert.equal((await work.POST(request({action:"retake",submissionId:submission}),params)).status,404);
  context.owned=true;context.status="in_progress";
  assert.equal((await work.POST(request({action:"retake",submissionId:submission}),params)).status,409);
  context.status="submitted";context.calls=[];
  assert.equal((await work.POST(request({action:"comment",submissionId:submission,questionId:null,body:"  Comment  ",authorId:student}),params)).status,201);
  const insert=context.calls.find((call)=>call[0]==="insert")[1];
  assert.deepEqual(insert,{submission_id:submission,question_id:null,author_id:teacher,body:"Comment"});
  for(const [key,value] of [["id",submission],["assignment_id",assignment],["student_id",student]])assert.ok(context.calls.some((call)=>call[0]==="eq"&&call[1]===key&&call[2]===value));
  assert.equal((await work.POST(request({action:"comment",submissionId:submission,questionId:null,body:" "}),params)).status,400);
  context.calls=[];
  assert.equal((await work.POST(request({action:"retake",submissionId:submission,extraAttempts:100}),params)).status,200);
  assert.deepEqual(context.calls.at(-1),["rpc","grant_assignment_retake",{p_submission:submission}]);
  assert.equal((await report.GET(request(),params)).status,200);
  console.log("Assignment feedback API tests passed (staff/owner guards, submission binding, validated comments and server-only allowance)");
}finally{delete globalThis.__satFeedbackTest;}
