import assert from "node:assert/strict";
import { almatyInputToUtcIso, utcIsoToAlmatyInput } from "../lib/timezone.ts";
assert.equal(almatyInputToUtcIso("2026-11-20","00:15"),"2026-11-19T19:15:00.000Z");
assert.equal(almatyInputToUtcIso("2028-02-29","23:59"),"2028-02-29T18:59:00.000Z");
for (const date of ["2026-02-29","2026-04-31","2026-13-01","2026-00-01","2026-01-00","0000-01-01"]) assert.equal(almatyInputToUtcIso(date,"12:00"),null,date);
for (const time of ["24:00","12:60","99:99","1:00"]) assert.equal(almatyInputToUtcIso("2026-11-20",time),null,time);
assert.deepEqual(utcIsoToAlmatyInput("2026-11-19T19:15:00Z"),{date:"2026-11-20",time:"00:15"});
console.log("Homework deadline timezone tests passed (calendar validation, leap years and midnight round-trip)");
