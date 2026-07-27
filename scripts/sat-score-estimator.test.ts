import assert from "node:assert/strict";
import { calculateScore } from "../lib/sat-score-estimator/calculateScore.ts";
import {
  clampCorrectAnswers,
  estimateSectionScore
} from "../lib/sat-score-estimator/estimateSectionScore.ts";
import { estimateTotalScore } from "../lib/sat-score-estimator/estimateTotalScore.ts";
import { estimateModule2Route } from "../lib/sat-score-estimator/routing.ts";
import type { TestScoringProfile } from "../lib/sat-score-estimator/types.ts";

assert.equal(clampCorrectAnswers(31, 27), 27, "RW input should not exceed 27");
assert.equal(clampCorrectAnswers(24, 22), 22, "Math input should not exceed 22");
assert.equal(clampCorrectAnswers(-4, 22), 0, "Negative inputs should become 0");
assert.equal(clampCorrectAnswers(18.9, 22), 18, "Inputs should be whole numbers");

assert.equal(
  estimateModule2Route({
    module1Correct: 22,
    module1Total: 27,
    section: "reading-writing"
  }),
  "harder",
  "Higher Module 1 performance should choose harder route"
);

assert.equal(
  estimateModule2Route({
    module1Correct: 9,
    module1Total: 22,
    section: "math"
  }),
  "easier",
  "Low Module 1 performance should choose easier route"
);

const manualHarder = estimateSectionScore({
  input: {
    module1Correct: 20,
    module1Total: 22,
    module2Correct: 18,
    module2Route: "harder",
    module2Total: 22
  },
  routeSource: "manual",
  section: "math"
});

assert.equal(manualHarder.route, "harder", "Manual route override should work");
assert.ok(
  manualHarder.estimatedScore >= 200 && manualHarder.estimatedScore <= 800,
  "Section score should be between 200 and 800"
);
assert.equal(
  manualHarder.estimatedScore % 10,
  0,
  "Section scores should round to the nearest 10"
);
assert.ok(
  manualHarder.lowerBound <= manualHarder.estimatedScore &&
    manualHarder.upperBound >= manualHarder.estimatedScore,
  "Range should always contain the estimated score"
);

const easierSameRaw = estimateSectionScore({
  input: {
    module1Correct: 20,
    module1Total: 22,
    module2Correct: 18,
    module2Route: "easier",
    module2Total: 22
  },
  routeSource: "manual",
  section: "math"
});

assert.notEqual(
  manualHarder.estimatedScore,
  easierSameRaw.estimatedScore,
  "Harder and easier routes may produce different estimates for the same raw answers"
);

const total = estimateTotalScore({
  math: {
    module1Correct: 20,
    module1Total: 22,
    module2Correct: 18,
    module2Route: "harder",
    module2Total: 22
  },
  readingWriting: {
    module1Correct: 23,
    module1Total: 27,
    module2Correct: 22,
    module2Route: "harder",
    module2Total: 27
  },
  readingWritingRouteSource: "auto"
});

assert.ok(
  total.totalEstimatedScore >= 400 && total.totalEstimatedScore <= 1600,
  "Total score should be between 400 and 1600"
);
assert.ok(
  total.totalLowerBound <= total.totalEstimatedScore &&
    total.totalUpperBound >= total.totalEstimatedScore,
  "Total range should contain the estimated score"
);
assert.equal(
  total.readingWriting.routeSource,
  "auto",
  "Generic auto result should be labeled as an estimate"
);

const scoringProfile: TestScoringProfile = {
  conversionTable: {
    "38": 760
  },
  route: "harder",
  section: "math",
  testId: "mock-test-1",
  version: "v1"
};

const profiled = calculateScore({
  input: {
    module1Correct: 20,
    module1Total: 22,
    module2Correct: 18,
    module2Route: "harder",
    module2Total: 22
  },
  scoringProfile,
  section: "math"
});

assert.equal(
  profiled.estimatedScore,
  760,
  "Test-specific scoring profile should take priority over generic estimator"
);

console.log("sat-score-estimator tests passed");
