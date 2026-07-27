import type { SatSection } from "./types.ts";

export const SECTION_ESTIMATOR_CONFIG = {
  readingWriting: {
    easierRouteEstimatedCeiling: 650,
    maxScore: 800,
    minScore: 200,
    module1Total: 27,
    module2Total: 27,
    uncertainty: 30
  },
  math: {
    easierRouteEstimatedCeiling: 650,
    maxScore: 800,
    minScore: 200,
    module1Total: 22,
    module2Total: 22,
    uncertainty: 30
  }
} as const;

export const ROUTING_THRESHOLDS = {
  readingWriting: 0.65,
  math: 0.65
} as const;

export const SCORING_WEIGHTS = {
  module1: 0.45,
  module2: 0.55
} as const;

export const MODULE1_CORRECTIONS = {
  strongModule1Accuracy: 0.85,
  strongModule1Bonus: 10,
  weakModule1Accuracy: 0.4,
  weakModule1Penalty: 25
} as const;

export const UNCERTAINTY_CONFIG = {
  autoRouteExtra: 15,
  genericProfileExtra: 10,
  moduleMismatchExtra: 10,
  moduleMismatchThreshold: 0.25,
  nearThresholdExtra: 10,
  nearThresholdWindow: 0.06,
  weakPerformanceExtra: 10,
  weakPerformanceThreshold: 0.35
} as const;

export function getSectionConfig(section: SatSection) {
  return section === "reading-writing"
    ? SECTION_ESTIMATOR_CONFIG.readingWriting
    : SECTION_ESTIMATOR_CONFIG.math;
}

export function getRoutingThreshold(section: SatSection) {
  return section === "reading-writing"
    ? ROUTING_THRESHOLDS.readingWriting
    : ROUTING_THRESHOLDS.math;
}
