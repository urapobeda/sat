import { getRoutingThreshold } from "./config.ts";
import type { ModuleRoute, SatSection } from "./types.ts";

export function estimateModule2Route({
  module1Correct,
  module1Total,
  section
}: {
  module1Correct: number;
  module1Total: number;
  section: SatSection;
}): ModuleRoute {
  if (module1Total <= 0) {
    return "easier";
  }

  const accuracy = module1Correct / module1Total;

  return accuracy >= getRoutingThreshold(section) ? "harder" : "easier";
}
