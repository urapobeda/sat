import { TeacherLivePage } from "@/components/live/LivePractice";
export const metadata = { title: "Live classwork" };
export default async function Page({ params }: { params: Promise<{ lessonId: string }> }) {
  return <TeacherLivePage lessonId={(await params).lessonId} />;
}
