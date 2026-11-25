import { StudentLivePage } from "@/components/live/LivePractice";
export const metadata = { title: "Live practice" };
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  return <StudentLivePage code={(await params).code.toUpperCase()} />;
}
