import assert from "node:assert/strict";
import { QuestionStopwatch, countedAnswerSeconds, getQuestionTimingSummaries, summarizeQuestionTimings } from "../lib/practiceTiming.ts";

const first = new QuestionStopwatch();
assert.equal(first.seconds(100000), 0, "preloaded questions have no running timer");
first.start(1000);
first.start(3000);
assert.equal(first.seconds(5500), 4, "rerenders never restart the current timer");
assert.equal(first.submit(6500), 5);
assert.equal(first.seconds(90000), 5, "network waits and reading feedback never add solving time");
first.start(100000);
assert.equal(first.seconds(110000), 5, "returning to a submitted question keeps its frozen time");

const paused = new QuestionStopwatch();
paused.start(0);
paused.pause(2500);
assert.equal(paused.seconds(80000), 2, "loading and time on other questions do not count");
paused.start(80000);
assert.equal(paused.submit(83500), 6);
const second = new QuestionStopwatch();
second.start(83500);
assert.equal(second.seconds(84000), 0, "every new question starts from zero");
assert.equal(paused.seconds(100000), 6);

const retry = new QuestionStopwatch();
retry.start(0);
assert.equal(retry.submit(4000), 4);
retry.retry(44000, true);
assert.equal(retry.submit(47000), 7, "retrying a failed API check preserves solve time and excludes the failed request");
const hiddenRetry = new QuestionStopwatch();
hiddenRetry.start(0);
hiddenRetry.submit(3000);
hiddenRetry.retry(30000, false);
assert.equal(hiddenRetry.seconds(60000), 3);
hiddenRetry.start(60000);
assert.equal(hiddenRetry.submit(62000), 5);

assert.equal(countedAnswerSeconds(false, 50), null, "a server-graded wrong answer never records time");
assert.equal(countedAnswerSeconds(true, 50), 50);
assert.equal(countedAnswerSeconds(true, 0), 0);
for (const invalid of [null, undefined, -1, 2.5, Infinity, NaN, 86401]) assert.equal(countedAnswerSeconds(true, invalid), null);

const stats = getQuestionTimingSummaries([
  { questionId: "linear-1", timeSpentSeconds: 10 },
  { questionId: "linear-1", timeSpentSeconds: 30 },
  { questionId: "linear-2", timeSpentSeconds: 80 },
  { questionId: "geometry-1", timeSpentSeconds: 120 },
  { questionId: "bad-data", timeSpentSeconds: -10 }
]);
assert.deepEqual(stats.get("linear-1"), { attempts: 2, totalSeconds: 40, avgSeconds: 20 });
assert.deepEqual(summarizeQuestionTimings([{ id: "linear-1" }, { id: "linear-2" }], stats), { attempts: 3, totalSeconds: 120, avgSeconds: 40 }, "topic averages include every correct attempt, weighted by samples");
assert.deepEqual(summarizeQuestionTimings([{ id: "linear-1" }, { id: "linear-1" }], stats), stats.get("linear-1"));
assert.deepEqual(summarizeQuestionTimings([{ id: "not-timed" }], stats), { attempts: 0, totalSeconds: 0, avgSeconds: null });
assert.equal(stats.has("bad-data"), false);
console.log("practice-timing tests passed");
