import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SAT Score Calculator",
  description: "Estimate your Digital SAT score from correct answers in each module."
};

export default function SatScoreCalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
