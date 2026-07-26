export type AdaptiveRoute = "easier" | "harder";

export type AdaptiveRoutingConfig = {
  harderRouteThreshold: number;
  minimumQuestions: number;
};

export type AdaptiveRoutingInput = {
  correctAnswers: number;
  totalQuestions: number;
};

export const DEFAULT_ADAPTIVE_ROUTING_CONFIG: AdaptiveRoutingConfig = {
  harderRouteThreshold: 0.6,
  minimumQuestions: 1
};

export function determineAdaptiveRoute(
  input: AdaptiveRoutingInput,
  config: AdaptiveRoutingConfig = DEFAULT_ADAPTIVE_ROUTING_CONFIG
): AdaptiveRoute {
  if (input.totalQuestions < config.minimumQuestions) {
    throw new Error("Not enough answered questions to determine adaptive route.");
  }

  if (input.correctAnswers < 0 || input.correctAnswers > input.totalQuestions) {
    throw new Error("Correct answers must be between 0 and total questions.");
  }

  const accuracy = input.correctAnswers / input.totalQuestions;

  return accuracy >= config.harderRouteThreshold ? "harder" : "easier";
}
