import { StudyPlanPage } from "@/components/study-plan/StudyPlanPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Study Plan" };

export default function Page() {
  return <StudyPlanPage />;
}
