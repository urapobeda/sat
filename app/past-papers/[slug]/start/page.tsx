import { PaperRunner } from "@/components/past-papers/PaperRunner";

export default async function PaperStartRoute({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ section?: string; attempt?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const section = query.section === "math" || query.section === "reading-writing" ? query.section : "full";
  return <PaperRunner slug={slug} section={section} attemptId={query.attempt} />;
}
