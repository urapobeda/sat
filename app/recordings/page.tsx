import { LessonRecordingsPage } from "@/components/dashboard/LessonRecordingsPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Lesson Recordings" };

export default function RecordingsRoute() {
  return <LessonRecordingsPage />;
}
