import { AdminUsers } from "@/components/staff/AdminUsers";
import { requirePageRole } from "@/lib/server/roles";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Users" };
export default async function AdminUsersPage() {
  const actor = await requirePageRole("admin");
  return <AdminUsers currentUserId={actor.id} />;
}
