import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {z} from 'zod';
const id='00000000-0000-4000-8000-000000000001';
const state={role:'teacher',calls:[],error:null,data:{id},rows:[],z};globalThis.__materialsTest=state;
const dataUrl=value=>`data:text/javascript;base64,${Buffer.from(value).toString('base64')}`;
const mock=dataUrl(`const s=globalThis.__materialsTest;
export const z=s.z;export const NextResponse={json:(v,i)=>Response.json(v,i)};
const result=()=>Promise.resolve({data:s.data,error:s.error});
const chain={eq(k,v){s.calls.push({eq:[k,v]});return chain;},select(){return chain;},single:result,maybeSingle:result,then(resolve,reject){return result().then(resolve,reject);}};
const db={from(table){s.calls.push({table});return {select(){return chain;},insert(v){s.calls.push({insert:v});return chain;},upsert(v,o){s.calls.push({upsert:v,options:o});return chain;},update(v){s.calls.push({update:v});return chain;},delete(){s.calls.push({delete:true});return chain;}};},rpc(name,args){s.calls.push({rpc:name,args});return {range:async(from,to)=>({data:s.rows.slice(from,to+1),error:s.error}),then(resolve,reject){return result().then(resolve,reject);}};}};
export const getApiRoleActor=async()=>s.role?{id:'${id}',role:s.role}:null;
export const getGroupStaff=async()=>s.role&&s.role!=='student'?{actor:{id:'${id}',role:s.role},db}:null;
export const getSupabaseUserClient=()=>db;`);
async function load(filename,imports={}){
  let source=(await readFile(new URL(filename,import.meta.url),'utf8')).replace('import "server-only";','');
  source=source.replace(/from ["']([^"']+)["']/g,(_,name)=>`from "${imports[name]??mock}"`);
  return dataUrl(ts.transpileModule(source,{compilerOptions:{module:99,target:9}}).outputText);
}
const pure=await load('../lib/courseMaterials.ts'),helper=await load('../lib/server/materialAccess.ts',{'@/lib/courseMaterials':pure});
const imports={'@/lib/server/materialAccess':helper,'@/lib/server/lessonAccess':await load('../lib/server/lessonAccess.ts')};
const create=await import(await load('../app/api/teacher/materials/route.ts',imports));
const update=await import(await load('../app/api/teacher/materials/[materialId]/route.ts',imports));
const single=await import(await load('../app/api/materials/[materialId]/route.ts',imports));
const list=await import(await load('../app/api/materials/route.ts',imports));
const hard=await import(await load('../app/api/hard-questions/route.ts',imports));
const request=(body={},query='')=>({json:async()=>body,headers:new Headers({authorization:'Bearer fixture'}),nextUrl:new URL('http://localhost/api/materials'+query)});
const context={params:Promise.resolve({materialId:id})};
const draft={groupId:null,lessonId:null,kind:'text',title:'Reading',section:'general',body:'# Text',url:'',position:1,published:false,created_by:'spoofed'};
try{
  for(const role of [null,'student']){state.role=role;assert.equal((await create.POST(request(draft))).status,403);assert.equal((await update.PATCH(request(draft),context)).status,403);assert.equal((await update.DELETE(request(),context)).status,403);}
  assert.equal(state.calls.length,0);state.role=null;assert.equal((await list.GET(request())).status,401);assert.equal((await hard.POST(request())).status,401);
  state.role='student';assert.equal((await list.GET(request({},'?context=1'))).status,403);
  state.role='teacher';assert.equal((await create.POST(request(draft))).status,201);assert.equal(state.calls.findLast(c=>c.insert).insert.created_by,id);
  for(const changes of [{body:''},{kind:'link',url:'javascript:alert(1)'},{position:0},{title:' '},{kind:'link',url:'https://good.test@evil.test'}])assert.equal((await create.POST(request({...draft,...changes}))).status,400);
  assert.equal((await update.PATCH(request({action:'publish',published:true,created_by:'spoofed'}),context)).status,200);
  assert.deepEqual(state.calls.findLast(c=>c.update).update,{published:true});
  state.data=null;assert.equal((await single.GET(request(),context)).status,404);assert.equal((await update.DELETE(request(),context)).status,404);
  state.error={code:'42501',message:'private schema secret'};const failure=await create.POST(request(draft));assert.equal(failure.status,403);assert.ok(!(await failure.text()).includes('secret'));
  state.error=null;state.rows=Array.from({length:1001},()=>({id,title:'Metadata'}));const response=await list.GET(request());assert.equal((await response.json()).materials.length,1001);assert.equal(response.headers.get('cache-control'),'private, no-store');
  state.role='student';state.data=[{question_id:id,marked:true,mistake_count:0}];assert.equal((await hard.POST(request({questionId:id,marked:true,student_id:'spoofed'}))).status,200);
  assert.equal(state.calls.findLast(c=>c.upsert).upsert.student_id,id);assert.equal(state.calls.findLast(c=>c.upsert).options.ignoreDuplicates,true);
  assert.equal((await hard.POST(request({questionId:'bad',marked:true}))).status,400);
  assert.equal((await hard.POST(request({questionId:id,marked:false}))).status,200);assert.ok(state.calls.some(c=>c.eq?.[0]==='student_id'&&c.eq[1]===id));
  console.log('Course material API tests passed: role guards, validation, publication, RLS failures, pagination, flag ownership and safe errors.');
}finally{delete globalThis.__materialsTest;}
