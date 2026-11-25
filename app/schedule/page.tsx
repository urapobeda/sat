import { SchedulePage } from "@/components/dashboard/SchedulePage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Schedule" };

export default function ScheduleRoute() {
  return <SchedulePage />;
}
