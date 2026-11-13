import assert from "node:assert/strict";
import { getSessionStreak } from "../lib/sessionStreak.ts";

const sessions = (...dates: string[]) => dates.map((date) => ({ date }));
const now = Date.parse("2026-11-13T19:30:00Z");
const attempts = sessions("2026-11-13T19:10:00Z", "2026-11-12T20:00:00Z");
assert.equal(getSessionStreak(attempts, now, "Asia/Qyzylorda"), 2);
assert.equal(getSessionStreak(attempts, now, "America/Los_Angeles"), 2);
// These UTC dates are two distinct local days in UTC+5, but one in UTC.
const midnight = sessions("2026-11-13T19:10:00Z", "2026-11-13T18:50:00Z");
assert.equal(getSessionStreak(midnight, now, "Asia/Qyzylorda"), 2);
assert.equal(getSessionStreak(midnight, now, "UTC"), 1);
// Yesterday counts; a missed full day breaks the streak.
assert.equal(getSessionStreak(sessions("2026-11-13T18:00:00Z"), now, "Asia/Qyzylorda"), 1);
assert.equal(getSessionStreak(sessions("2026-11-12T18:00:00Z"), now, "Asia/Qyzylorda"), 0);
// Duplicate sessions and invalid timestamps do not inflate the streak.
assert.equal(getSessionStreak([...midnight, ...midnight, { date: "invalid" }], now, "Asia/Qyzylorda"), 2);
assert.equal(getSessionStreak([], now, "Asia/Qyzylorda"), 0);
// Consecutive local days across both DST changes.
assert.equal(getSessionStreak(sessions("2026-03-09T04:30:00Z", "2026-03-08T05:30:00Z", "2026-03-07T05:30:00Z"), Date.parse("2026-03-09T05:00:00Z"), "America/New_York"), 3);
assert.equal(getSessionStreak(sessions("2026-11-02T05:30:00Z", "2026-11-01T04:30:00Z", "2026-10-31T04:30:00Z"), Date.parse("2026-11-02T06:00:00Z"), "America/New_York"), 3);
console.log("Session streak tests passed (local midnight, DST, gaps and duplicates)");
