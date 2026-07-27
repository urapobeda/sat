import { estimateSectionScore } from "./estimateSectionScore.ts";
import type {
  RouteSource,
  SatEstimateResult,
  SectionEstimateInput,
  TestScoringProfile
} from "./types.ts";

export function estimateTotalScore({
  math,
  mathRouteSource = "manual",
  readingWriting,
  readingWritingRouteSource = "manual",
  scoringProfiles = []
}: {
  math: SectionEstimateInput;
  mathRouteSource?: RouteSource;
  readingWriting: SectionEstimateInput;
  readingWritingRouteSource?: RouteSource;
  scoringProfiles?: TestScoringProfile[];
}): SatEstimateResult {
  const readingWritingResult = estimateSectionScore({
    input: readingWriting,
    routeSource: readingWritingRouteSource,
    scoringProfile: scoringProfiles.find(
      (profile) =>
        profile.section === "reading-writing" &&
        profile.route === readingWriting.module2Route
    ),
    section: "reading-writing"
  });
  const mathResult = estimateSectionScore({
    input: math,
    routeSource: mathRouteSource,
    scoringProfile: scoringProfiles.find(
      (profile) => profile.section === "math" && profile.route === math.module2Route
    ),
    section: "math"
  });

  return {
    math: mathResult,
    readingWriting: readingWritingResult,
    totalEstimatedScore:
      readingWritingResult.estimatedScore + mathResult.estimatedScore,
    totalLowerBound: readingWritingResult.lowerBound + mathResult.lowerBound,
    totalUpperBound: readingWritingResult.upperBound + mathResult.upperBound
  };
}
