import { GroupsPage } from "@/components/groups/GroupsPage";
import { requirePageRole } from "@/lib/server/roles";
export default async function TeacherGroupsPage() {
  const actor = await requirePageRole("teacher");
  return <GroupsPage admin={actor.role === "admin"} />;
}
