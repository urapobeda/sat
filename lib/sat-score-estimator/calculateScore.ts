import { estimateSectionScore } from "./estimateSectionScore.ts";
import type {
  RouteSource,
  SatSection,
  SectionEstimateInput,
  TestScoringProfile
} from "./types.ts";

export function calculateScore({
  input,
  routeSource = "manual",
  scoringProfile,
  section
}: {
  input: SectionEstimateInput;
  routeSource?: RouteSource;
  scoringProfile?: TestScoringProfile | null;
  section: SatSection;
}) {
  return estimateSectionScore({
    input,
    routeSource,
    scoringProfile,
    section
  });
}
