import { TestsPage } from "@/components/tests/TestsPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Practice Tests" };

export default function TestsRoute() {
  return <TestsPage />;
}
