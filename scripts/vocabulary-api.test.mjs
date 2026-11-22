import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { z } from "zod";
const id = "00000000-0000-4000-8000-000000000001";
const state = { role: "teacher", calls: [], error: null, data: { id }, words: [], z };
globalThis.__vocabularyTest = state;
const dataUrl = value => `data:text/javascript;base64,${Buffer.from(value).toString("base64")}`;
const mock = dataUrl(`const s=globalThis.__vocabularyTest;
export const z=s.z; export const NextResponse={json:(v,i)=>Response.json(v,i)};
const result=()=>Promise.resolve({data:s.data,error:s.error});
const chain={eq(k,v){s.calls.push({eq:[k,v]});return chain;},select(){return chain;},single:result,maybeSingle:result};
const db={from(table){s.calls.push({table});return {
insert(value){s.calls.push({insert:value});return chain;},update(value){s.calls.push({update:value});return chain;},delete(){s.calls.push({delete:true});return chain;}};
},rpc(name,args){s.calls.push({rpc:name,args});return {range:async(from,to)=>({data:s.words.slice(from,to+1),error:s.error}),then(resolve,reject){return Promise.resolve({data:s.data,error:s.error}).then(resolve,reject);}}}};
export const getApiRoleActor=async()=>s.role?{id:'${id}',role:s.role}:null;
export const getGroupStaff=async()=>s.role&&s.role!=='student'?{actor:{id:'${id}',role:s.role},db}:null;
export const getSupabaseUserClient=()=>db;`);
async function load(filename, imports = {}) {
  let source = (await readFile(new URL(filename, import.meta.url), "utf8")).replace('import "server-only";', "");
  source = source.replace(/from "([^"]+)"/g, (_, name) => `from "${imports[name] ?? mock}"`);
  return dataUrl(ts.transpileModule(source, { compilerOptions: { module: 99, target: 9 } }).outputText);
}
const pure = await load("../lib/vocabulary.ts");
const helper = await load("../lib/server/vocabularyAccess.ts", { "@/lib/vocabulary": pure });
const imports = { "@/lib/server/vocabularyAccess": helper, "@/lib/vocabulary": pure, "@/lib/server/lessonAccess": await load("../lib/server/lessonAccess.ts") };
const create = await import(await load("../app/api/teacher/vocabulary/route.ts", imports));
const update = await import(await load("../app/api/teacher/vocabulary/[wordId]/route.ts", imports));
const bulk = await import(await load("../app/api/teacher/vocabulary/bulk/route.ts", imports));
const list = await import(await load("../app/api/vocabulary/route.ts", imports));
const request = (body = {}, query = "") => ({ json: async () => body, headers: new Headers({ authorization: "Bearer fixture" }), nextUrl: new URL(`http://localhost/api/vocabulary${query}`) });
const context = { params: Promise.resolve({ wordId: id }) };
const draft = { word: "infer", partOfSpeech: "verb", definitionEn: "Reach a conclusion.", translationRu: "Translation", example: "", groupId: null, lessonId: null, created_by: "spoofed" };
try {
  for (const role of [null, "student"]) {
    state.role = role;
    assert.equal((await create.POST(request(draft))).status, 403);
    assert.equal((await update.PATCH(request(draft), context)).status, 403);
    assert.equal((await update.DELETE(request(), context)).status, 403);
    assert.equal((await bulk.POST(request({ text: "word — translation — definition", groupId: null, lessonId: null }))).status, 403);
  }
  assert.equal(state.calls.length, 0);
  assert.equal((await list.GET(request())).status, 200);
  assert.equal((await list.GET(request({}, "?context=1"))).status, 403);
  state.role = null; assert.equal((await list.GET(request())).status, 401);
  state.role = "teacher";
  assert.equal((await create.POST(request(draft))).status, 201);
  assert.equal(state.calls.findLast(call => call.insert).insert.created_by, id);
  assert.equal((await create.POST(request({ ...draft, word: "two words" }))).status, 400);
  assert.equal((await update.PATCH(request(draft), context)).status, 200);
  assert.equal("created_by" in state.calls.findLast(call => call.update).update, false);
  state.data = null; assert.equal((await update.DELETE(request(), context)).status, 404);
  state.error = { code: "42501" }; assert.equal((await create.POST(request(draft))).status, 403);
  state.error = { code: "23505" }; assert.equal((await create.POST(request(draft))).status, 409);
  state.error = null; state.data = [{ inserted: 1, skipped: 2 }];
  assert.deepEqual(await (await bulk.POST(request({ text: "infer — meaning — Definition", groupId: null, lessonId: null }))).json(), { inserted: 1, skipped: 2 });
  const calls = state.calls.length;
  assert.equal((await bulk.POST(request({ text: "bad", groupId: null, lessonId: null }))).status, 400);
  assert.equal(state.calls.length, calls, "malformed bulk import never writes partial data");
  state.words = Array.from({ length: 1001 }, (_, i) => ({ id: String(i) }));
  const response = await list.GET(request());
  assert.equal((await response.json()).words.length, 1001);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  console.log("Vocabulary API tests passed: role guards, validation, spoof prevention, RLS errors, atomic import dispatch and pagination.");
} finally { delete globalThis.__vocabularyTest; }
