export type SatSection = "reading-writing" | "math";

export type ModuleRoute = "harder" | "easier";

export type RouteSource = "manual" | "auto";

export type SectionEstimateInput = {
  module1Correct: number;
  module2Correct: number;
  module1Total: number;
  module2Total: number;
  module2Route: ModuleRoute;
};

export type SectionEstimateResult = {
  estimatedScore: number;
  lowerBound: number;
  upperBound: number;
  rawCorrect: number;
  rawTotal: number;
  accuracy: number;
  module1Accuracy: number;
  module2Accuracy: number;
  route: ModuleRoute;
  routeSource: RouteSource;
  confidence: "low" | "medium";
};

export type SatEstimateResult = {
  readingWriting: SectionEstimateResult;
  math: SectionEstimateResult;
  totalEstimatedScore: number;
  totalLowerBound: number;
  totalUpperBound: number;
};

export type TestScoringProfile = {
  testId: string;
  version: string;
  section: SatSection;
  route: ModuleRoute;
  conversionTable: Record<string, number>;
};
