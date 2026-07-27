import {
  getRoutingThreshold,
  getSectionConfig,
  MODULE1_CORRECTIONS,
  SCORING_WEIGHTS,
  UNCERTAINTY_CONFIG
} from "./config.ts";
import type {
  RouteSource,
  SatSection,
  SectionEstimateInput,
  SectionEstimateResult,
  TestScoringProfile
} from "./types.ts";

export function clampCorrectAnswers(value: number, total: number) {
  const integerValue = Math.trunc(Number.isFinite(value) ? value : 0);

  return Math.min(total, Math.max(0, integerValue));
}

export function roundToNearestTen(value: number) {
  return Math.round(value / 10) * 10;
}

export function estimateSectionScore({
  input,
  routeSource = "manual",
  scoringProfile,
  section
}: {
  input: SectionEstimateInput;
  routeSource?: RouteSource;
  scoringProfile?: TestScoringProfile | null;
  section: SatSection;
}): SectionEstimateResult {
  const config = getSectionConfig(section);
  const module1Correct = clampCorrectAnswers(input.module1Correct, input.module1Total);
  const module2Correct = clampCorrectAnswers(input.module2Correct, input.module2Total);
  const rawCorrect = module1Correct + module2Correct;
  const rawTotal = input.module1Total + input.module2Total;
  const module1Accuracy = input.module1Total > 0 ? module1Correct / input.module1Total : 0;
  const module2Accuracy = input.module2Total > 0 ? module2Correct / input.module2Total : 0;
  const accuracy = rawTotal > 0 ? rawCorrect / rawTotal : 0;

  if (
    scoringProfile &&
    scoringProfile.section === section &&
    scoringProfile.route === input.module2Route
  ) {
    const profileScore = scoringProfile.conversionTable[String(rawCorrect)];
    const estimatedScore = clampScore(
      roundToNearestTen(profileScore ?? genericScoreEstimate({
        config,
        module1Accuracy,
        module2Accuracy,
        route: input.module2Route
      })),
      config.minScore,
      config.maxScore
    );

    return buildResult({
      accuracy,
      estimatedScore,
      module1Accuracy,
      module2Accuracy,
      module1Correct,
      module2Correct,
      rawCorrect,
      rawTotal,
      route: input.module2Route,
      routeSource,
      section,
      uncertainty: 10
    });
  }

  const estimatedScore = clampScore(
    roundToNearestTen(
      genericScoreEstimate({
        config,
        module1Accuracy,
        module2Accuracy,
        route: input.module2Route
      })
    ),
    config.minScore,
    config.maxScore
  );

  return buildResult({
    accuracy,
    estimatedScore,
    module1Accuracy,
    module2Accuracy,
    module1Correct,
    module2Correct,
    rawCorrect,
    rawTotal,
    route: input.module2Route,
    routeSource,
    section,
    uncertainty: estimateUncertainty({
      accuracy,
      module1Accuracy,
      module2Accuracy,
      routeSource,
      section
    })
  });
}

function genericScoreEstimate({
  config,
  module1Accuracy,
  module2Accuracy,
  route
}: {
  config: ReturnType<typeof getSectionConfig>;
  module1Accuracy: number;
  module2Accuracy: number;
  route: SectionEstimateInput["module2Route"];
}) {
  const weightedAccuracy =
    module1Accuracy * SCORING_WEIGHTS.module1 +
    module2Accuracy * SCORING_WEIGHTS.module2;
  const scoreRange =
    route === "harder"
      ? config.maxScore - config.minScore
      : config.easierRouteEstimatedCeiling - config.minScore;
  let score = config.minScore + weightedAccuracy * scoreRange;

  if (module1Accuracy < MODULE1_CORRECTIONS.weakModule1Accuracy) {
    score -= MODULE1_CORRECTIONS.weakModule1Penalty;
  }

  if (
    module1Accuracy > MODULE1_CORRECTIONS.strongModule1Accuracy &&
    route === "harder"
  ) {
    score += MODULE1_CORRECTIONS.strongModule1Bonus;
  }

  return score;
}

function estimateUncertainty({
  accuracy,
  module1Accuracy,
  module2Accuracy,
  routeSource,
  section
}: {
  accuracy: number;
  module1Accuracy: number;
  module2Accuracy: number;
  routeSource: RouteSource;
  section: SatSection;
}) {
  const config = getSectionConfig(section);
  const threshold = getRoutingThreshold(section);
  let uncertainty = config.uncertainty + UNCERTAINTY_CONFIG.genericProfileExtra;

  if (routeSource === "auto") {
    uncertainty += UNCERTAINTY_CONFIG.autoRouteExtra;
  }

  if (
    Math.abs(module1Accuracy - threshold) <=
    UNCERTAINTY_CONFIG.nearThresholdWindow
  ) {
    uncertainty += UNCERTAINTY_CONFIG.nearThresholdExtra;
  }

  if (
    Math.abs(module1Accuracy - module2Accuracy) >=
    UNCERTAINTY_CONFIG.moduleMismatchThreshold
  ) {
    uncertainty += UNCERTAINTY_CONFIG.moduleMismatchExtra;
  }

  if (accuracy <= UNCERTAINTY_CONFIG.weakPerformanceThreshold) {
    uncertainty += UNCERTAINTY_CONFIG.weakPerformanceExtra;
  }

  return uncertainty;
}

function buildResult({
  accuracy,
  estimatedScore,
  module1Accuracy,
  module2Accuracy,
  rawCorrect,
  rawTotal,
  route,
  routeSource,
  section,
  uncertainty
}: {
  accuracy: number;
  estimatedScore: number;
  module1Accuracy: number;
  module2Accuracy: number;
  module1Correct: number;
  module2Correct: number;
  rawCorrect: number;
  rawTotal: number;
  route: SectionEstimateInput["module2Route"];
  routeSource: RouteSource;
  section: SatSection;
  uncertainty: number;
}): SectionEstimateResult {
  const config = getSectionConfig(section);
  const lowerBound = clampScore(
    roundToNearestTen(estimatedScore - uncertainty),
    config.minScore,
    config.maxScore
  );
  const upperBound = clampScore(
    roundToNearestTen(estimatedScore + uncertainty),
    config.minScore,
    config.maxScore
  );

  return {
    accuracy,
    confidence: uncertainty >= 45 ? "low" : "medium",
    estimatedScore,
    lowerBound: Math.min(lowerBound, estimatedScore),
    module1Accuracy,
    module2Accuracy,
    rawCorrect,
    rawTotal,
    route,
    routeSource,
    upperBound: Math.max(upperBound, estimatedScore)
  };
}

function clampScore(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
