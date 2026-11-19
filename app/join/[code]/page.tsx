import { JoinGroupPage } from "@/components/groups/JoinGroupPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Join a group" };
export default async function JoinRoute({ params }: { params: Promise<{ code: string }> }) {
  return <JoinGroupPage code={(await params).code} />;
}
