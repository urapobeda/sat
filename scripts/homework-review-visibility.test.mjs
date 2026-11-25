import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const s = { rule:"after_submit", released:true, submitted:true, attempts:1, max:1, grants:0, reviews:0, feedbackError:false, owned:true, calls:[] };
globalThis.__homeworkReviewVisibility = s;
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const pure = url(ts.transpileModule(await readFile(new URL("../lib/homework.ts",import.meta.url),"utf8"),{compilerOptions:{module:99,target:9}}).outputText);
const mock = url(`const s=globalThis.__homeworkReviewVisibility;
export const toQuestionChoices=rows=>rows.map(row=>({...row,imageUrl:null}));
export const gradeQuestionAnswer=async()=>({});
export const getReviewQuestions=async()=>{s.reviews++;return [{id:'q',correctAnswer:'PRIVATE_KEY',correctLabel:'B',explanation:'PRIVATE_EXPLANATION',isCorrect:false}];};
export const getSupabaseAdminClient=()=>({
  rpc:async(name,args)=>{s.calls.push({rpc:name,args});return name==='assignment_answers_released'?{data:s.released,error:s.releaseError?{code:'42501'}:null}:{data:false,error:null};},
  from(table){const q={filters:[],select(columns){s.calls.push({table,columns});return q;},eq(key,value){q.filters.push([key,value]);s.calls.push({table,eq:[key,value]});return q;},in(){return q;},order(){return q;},limit(){return q;},
    maybeSingle:async()=>table==='assignment_submissions'?{data:s.owned?{id:'submission',assignment_id:'assignment',status:s.submitted?'submitted':'in_progress',correct_count:0,total_count:1,started_at:'2026-11-22T09:00:00Z',submitted_at:s.submitted?'2026-11-22T09:30:00Z':null}:null,error:null}:
      table==='assignments'?{data:{id:'assignment',group_id:'group',title:'Homework',instructions:'',show_answers:s.rule,due_at:s.due??null,max_attempts:s.max,published:true},error:null}:{data:{student_id:'student'},error:null},
    then(resolve,reject){let result={data:[],error:null};
      if(table==='assignment_questions')result.data=[{question_id:'q',position:1}];
      if(table==='questions')result.data=[{id:'q',question:'Public prompt',choices:[{label:'A',text:'One'},{label:'B',text:'Two'}],section:'math',difficulty:'easy',topic:'Algebra',question_type:'multiple-choice',correct_answer:'RAW_PRIVATE_KEY'}];
      if(table==='assignment_answers')result.data=[{question_id:'q',answer:'A',time_spent_seconds:23,is_correct:false}];
      if(table==='assignment_feedback')result={data:[{id:'comment',question_id:'q',body:'Teacher comment'}],error:s.feedbackError?{code:'42501'}:null};
      if(table==='assignment_retake_grants')result.count=s.grants;
      if(table==='assignment_submissions')result.count=s.attempts;
      return Promise.resolve(result).then(resolve,reject);
    }};return q;
  }
});`);
let source=(await readFile(new URL("../lib/server/homeworkAttempts.ts",import.meta.url),"utf8")).replace('import "server-only";',"");
source=source.replace(/from "([^"]+)"/g,(_,name)=>`from "${name==='@/lib/homework'?pure:mock}"`);
const attemptsModule=await import(url(ts.transpileModule(source,{compilerOptions:{module:99,target:9}}).outputText));
const load=()=>attemptsModule.loadHomeworkAttempt("student","submission");
try {
  s.rule="never"; const hidden=await load();
  assert.equal(hidden.review,null);assert.equal(s.reviews,0);assert.equal(JSON.stringify(hidden).includes("PRIVATE"),false);
  assert.equal(hidden.feedback[0].body,"Teacher comment");assert.equal(hidden.answers.q,"A");
  assert.ok(s.calls.some(call=>call.table==='assignment_submissions'&&call.eq?.[0]==='student_id'&&call.eq[1]==='student'));
  assert.ok(!s.calls.find(call=>call.table==='questions'&&call.columns)?.columns.includes('correct_answer'));
  s.rule="after_submit";s.max=2;s.released=false;
  const retake=await load();assert.equal(retake.review,null);assert.equal(retake.canRetake,true);assert.equal(s.reviews,0,"remaining attempts do not load the key");
  s.max=1;s.released=true;const visible=await load();assert.equal(visible.review[0].correctAnswer,"PRIVATE_KEY");assert.equal(visible.canRetake,false);
  s.rule="after_due";s.due="2099-12-31T23:59:00Z";const future=await load();assert.equal(future.review,null,"a future due date also blocks review if a release result is unexpectedly true");
  s.rule="after_submit";s.feedbackError=true;const partial=await load();assert.equal(partial.feedbackError,true);assert.ok(partial.review,"comment permission failure does not hide released answers");
  s.feedbackError=false;s.grants=1;assert.equal((await load()).canRetake,true);s.attempts=2;assert.equal((await load()).canRetake,false,"one grant gives one extra attempt");
  s.submitted=false;assert.equal((await load()).review,null);assert.deepEqual((await load()).feedback,[]);
  s.submitted=true;s.releaseError=true;await assert.rejects(load(),/Could not check answer visibility/);s.releaseError=false;
  s.owned=false;await assert.rejects(load(),/Attempt unavailable/);
  console.log("Homework review visibility tests passed: hidden keys never loaded/serialized, release and deadline gates, existing retake limits, optional comment errors and submission ownership.");
} finally {delete globalThis.__homeworkReviewVisibility;}
