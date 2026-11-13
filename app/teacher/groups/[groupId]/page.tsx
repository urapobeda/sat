import { GroupDetail } from "@/components/groups/GroupDetail";
import { requirePageRole } from "@/lib/server/roles";
export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const actor = await requirePageRole("teacher");
  return <GroupDetail groupId={(await params).groupId} admin={actor.role === "admin"} />;
}
