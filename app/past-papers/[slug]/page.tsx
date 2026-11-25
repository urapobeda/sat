import { PastPaperDetailsPage } from "@/components/past-papers/PastPaperDetailsPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Past Paper" };

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
