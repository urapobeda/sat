import { AdminUsers } from "@/components/staff/AdminUsers";
import { requirePageRole } from "@/lib/server/roles";
export default async function AdminUsersPage() {
  const actor = await requirePageRole("admin");
  return <AdminUsers currentUserId={actor.id} />;
}
