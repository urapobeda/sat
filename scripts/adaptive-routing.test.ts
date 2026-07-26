import assert from "node:assert/strict";
import {
  determineAdaptiveRoute,
  type AdaptiveRoutingConfig
} from "../lib/adaptiveRouting.ts";

const config: AdaptiveRoutingConfig = {
  harderRouteThreshold: 0.6,
  minimumQuestions: 5
};

assert.equal(
  determineAdaptiveRoute({ correctAnswers: 7, totalQuestions: 10 }, config),
  "harder",
  "60%+ performance should route to harder module"
);

assert.equal(
  determineAdaptiveRoute({ correctAnswers: 3, totalQuestions: 10 }, config),
  "easier",
  "Below-threshold performance should route to easier module"
);

assert.throws(
  () => determineAdaptiveRoute({ correctAnswers: 2, totalQuestions: 4 }, config),
  /Not enough answered questions/,
  "Routing should not run before the configured minimum question count"
);

assert.throws(
  () => determineAdaptiveRoute({ correctAnswers: 12, totalQuestions: 10 }, config),
  /Correct answers/,
  "Invalid scoring input should be rejected"
);

console.log("adaptive-routing tests passed");
