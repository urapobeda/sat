import { StudentHomeworkPage } from "@/components/homework/StudentHomeworkPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Homework" };

export default function HomeworkRoute() {
  return <StudentHomeworkPage />;
}
