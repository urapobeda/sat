import { PastPaperDetailsPage } from "@/components/past-papers/PastPaperDetailsPage";

type PastPaperDetailsRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PastPaperDetailsRoute({
  params
}: PastPaperDetailsRouteProps) {
  const { slug } = await params;

  return <PastPaperDetailsPage slug={slug} />;
}
