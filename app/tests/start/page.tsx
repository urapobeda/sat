import { TestStartPage } from "@/components/tests/start/TestStartPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Practice Test" };

export default function TestStartRoute() {
  return <TestStartPage />;
}
