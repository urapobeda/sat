import { JoinGroupPage } from "@/components/groups/JoinGroupPage";
export default async function JoinRoute({ params }: { params: Promise<{ code: string }> }) {
  return <JoinGroupPage code={(await params).code} />;
}
