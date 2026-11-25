import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const state = { tables: {}, calls: [], fail: false, race: false, plan: { id: "winner", target_score: 1420 } };
globalThis.__studentAnalytics = state;
const mock = `
const s = globalThis.__studentAnalytics;
export const normalizeTopic = (value) => value.toLowerCase();
export const getNextSATDate = () => new Date("2026-12-05");
export const formatSATDateForDatabase = () => "2026-12-05";
export const getSupabaseConfigDiagnostics = () => ({});
export const getSupabaseBrowserClient = () => ({from(table) {
  const query = { table, filters: [], ids: null, start: null, end: null, insertMode: false,
    select() { return this; }, order() { return this; }, not() { return this; },
    eq(key, value) { this.filters.push([key, value]); return this; },
    in(key, ids) { this.ids = ids; return this; },
    range(start, end) { this.start = start; this.end = end; return this; },
    insert() { this.insertMode = true; return this; },
    async maybeSingle() { return {data: s.race ? null : s.plan, error: null}; },
    async single() { return this.insertMode ? {data: null, error: {code:"23505", message:"duplicate"}} : {data:s.plan, error:null}; },
    then(resolve, reject) { return Promise.resolve().then(() => {
      s.calls.push({table, ids:this.ids, start:this.start});
      if (s.fail) return {data:null, error:{message:"permission denied"}};
      let rows = (s.tables[table] ?? []).filter(row => this.filters.every(([key, val]) => row[key] === val));
      if (this.ids) rows = rows.filter(row => this.ids.includes(row.id));
      const count = rows.length;
      rows = this.start === null ? rows.slice(0,1000) : rows.slice(this.start, this.end + 1);
      return {data:rows,error:null,count};
    }).then(resolve,reject); }
  }; return query;
}});
`;
const mockUrl = "data:text/javascript;base64," + Buffer.from(mock).toString("base64");
let source = await readFile(new URL("../lib/supabase/queries.ts", import.meta.url), "utf8");
source = source.replace(/from "@\/lib\/(supabase\/client|questions|satDates)"/g, `from "${mockUrl}"`)
  .replace('from "@/lib/supabase/questionPagination"', `from "${new URL("../lib/supabase/questionPagination.ts", import.meta.url).href}"`);
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const api = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));
try {
  process.env.TZ = "Asia/Almaty";
  const answers = Array.from({length:1105}, (_,i) => ({id:`a${i}`, user_id:"one", question_id:`q${i}`, is_correct:i%2===0, created_at:"2026-11-15T20:00:00Z"}));
  state.tables.practice_answers = answers;
  state.tables.test_answers = [];
  state.tables.questions = answers.map(row => ({id:row.question_id, topic:"Circles"}));
  state.tables.practice_sessions = answers.map(row => ({...row, started_at:row.created_at, completed_at:row.created_at}));
  state.tables.test_sessions = state.tables.practice_sessions;
  assert.equal((await api.getPracticeHistory("one")).length, 1105);
  assert.equal((await api.getTestHistory("one")).length, 1105);
  const activity = await api.getWeeklyQuestionActivity("one");
  assert.deepEqual(activity, [{weekStart:"2026-11-15",correct:553,wrong:552}]);
  state.calls = [];
  const first = api.getTopicPerformance("one");
  assert.equal(api.getTopicPerformance("one"), first, "concurrent views share the in-flight request");
  const performance = await first;
  assert.equal(performance[0].attempts,1105);
  assert.equal(state.calls.filter(call => call.table === "practice_answers" && call.start === 0).length,1);
  assert.ok(state.calls.filter(call => call.ids).every(call => call.ids.length <= 100));
  assert.deepEqual(await api.getTopicPerformance("two"),[],"requests remain scoped to each user");
  state.fail = true;
  await assert.rejects(api.getTopicPerformance("one"),/permission denied/);
  state.fail = false;
  assert.equal((await api.getTopicPerformance("one"))[0].attempts,1105,"a failed request must not poison retries");
  state.race = true;
  assert.deepEqual(await api.getOrCreateStudyPlan("one"), state.plan, "a concurrent creator's existing plan is retained");
  console.log("Student analytics passed (1105 rows, local week, bounded URLs, request sharing, user isolation, retries and study-plan creation race)");
} finally { delete globalThis.__studentAnalytics; }
