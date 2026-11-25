import { GroupsPage } from "@/components/groups/GroupsPage";
import { requirePageRole } from "@/lib/server/roles";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Groups" };
export default async function TeacherGroupsPage() {
  const actor = await requirePageRole("teacher");
  return <GroupsPage admin={actor.role === "admin"} />;
}
