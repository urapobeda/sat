import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const state={effects:[],states:[],requests:[],filters:[],timers:[],events:new Map(),removed:0,active:0,maxActive:0};
globalThis.__liveRealtimeTest=state;
const originalWindow=globalThis.window, originalDocument=globalThis.document;
globalThis.window={setInterval:fn=>{state.timers.push(fn);return 1;},clearInterval:()=>{},addEventListener:(key,fn)=>state.events.set(key,fn),removeEventListener:key=>state.events.delete(key)};
globalThis.document={visibilityState:"visible",addEventListener:(key,fn)=>state.events.set(key,fn),removeEventListener:key=>state.events.delete(key)};
const mock="data:text/javascript;base64,"+Buffer.from(`const s=globalThis.__liveRealtimeTest;
export const useEffect=fn=>s.effects.push(fn);export const useRef=value=>({current:value});export function useState(value){const i=s.states.length;s.states.push(value);return[value,next=>{s.states[i]=typeof next==='function'?next(s.states[i]):next;}];}
export const useStudentAccount=()=>({userId:'fixture-student',isLoading:false});
const channel={on(kind,filter,fn){s.filters.push({kind,filter,fn});return channel;},subscribe(fn){s.status=fn;return channel;}};
export const getSupabaseBrowserClient=()=>({channel:()=>channel,removeChannel:async()=>{s.removed++;}});
export const groupRequest=()=>new Promise((resolve,reject)=>{s.active++;s.maxActive=Math.max(s.active,s.maxActive);s.requests.push({resolve:value=>{s.active--;resolve(value);},reject:error=>{s.active--;reject(error);}});});`).toString("base64");
let source=(await readFile(new URL("../components/live/useLiveSnapshot.ts",import.meta.url),"utf8")).replace('"use client";',"");
source=source.replace(/from "([^"]+)"/g,()=>`from "${mock}"`);
const js=ts.transpileModule(source,{compilerOptions:{module:99,target:9}}).outputText;
const {useLiveSnapshot}=await import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));
// The React imports above use a deterministic hook harness rather than a DOM renderer.
function LiveHookHarness() { return useLiveSnapshot("ABCDEFGH"); }
const tick=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
const value=staff=>({session:{id:"fixture-session",status:"active"},staff});
try {
  const screen=LiveHookHarness(); const cleanup=state.effects[0]();
  assert.equal(state.requests.length,1);screen.reload();screen.reload();
  state.requests[0].resolve(value(false));await tick();
  assert.equal(state.requests.length,2,"overlapping refreshes coalesce into one follow-up read");
  assert.equal(state.maxActive,1);assert.deepEqual(state.filters.map(x=>x.filter.table),["live_sessions"],"students never subscribe to the private answer table");
  assert.equal(state.filters[0].filter.filter,"id=eq.fixture-session");
  state.requests[1].resolve(value(false));await tick();
  state.status("SUBSCRIBED");assert.equal(state.requests.length,3,"subscribe/reconnect refreshes missed changes");
  state.requests[2].resolve(value(false));await tick();
  state.status("CHANNEL_ERROR");state.timers[0]();assert.equal(state.requests.length,4,"polling recovers when the socket is unavailable");
  state.requests[3].reject(new Error("Network unavailable"));await tick();assert.equal(state.states[1].message,"Network unavailable");assert.equal(state.states[0].data.session.id,"fixture-session","optional refresh failure keeps the last usable question");
  state.events.get("online")();assert.equal(state.requests.length,5);
  cleanup();assert.equal(state.removed,1);state.requests[4].resolve(value(false));await tick();assert.equal(state.states[1].message,"Network unavailable","unmounted reads cannot update the screen");
  state.effects=[];state.states=[];state.filters=[];
  LiveHookHarness();const stopTeacher=state.effects[0]();
  state.requests[5].resolve(value(true));await tick();
  assert.deepEqual(state.filters.map(x=>x.filter.table),["live_sessions","live_answers"]);
  assert.equal(state.filters[1].filter.filter,"session_id=eq.fixture-session");stopTeacher();
  console.log("Live Realtime hook tests passed: channel scopes, student privacy, coalescing, reconnect recovery, polling, preserved data and cleanup.");
} finally {globalThis.window=originalWindow;globalThis.document=originalDocument;delete globalThis.__liveRealtimeTest;}
