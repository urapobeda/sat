import { TeacherHomeworkListPage } from "@/components/homework/TeacherHomeworkListPage";
import { requirePageRole } from "@/lib/server/roles";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Homework" };

export default async function TeacherHomeworkRoute() {
  const actor = await requirePageRole("teacher");
  return <TeacherHomeworkListPage admin={actor.role === "admin"} />;
}
