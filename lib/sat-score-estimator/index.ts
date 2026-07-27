export { calculateScore } from "./calculateScore.ts";
export {
  clampCorrectAnswers,
  estimateSectionScore,
  roundToNearestTen
} from "./estimateSectionScore.ts";
export { estimateTotalScore } from "./estimateTotalScore.ts";
export { estimateModule2Route } from "./routing.ts";
export type {
  ModuleRoute,
  RouteSource,
  SatEstimateResult,
  SatSection,
  SectionEstimateInput,
  SectionEstimateResult,
  TestScoringProfile
} from "./types.ts";
