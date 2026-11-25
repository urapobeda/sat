import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPracticeSetupPage } from "@/components/question-bank/SectionPracticeSetupPage";
import { getInitialQuestionCatalog } from "@/lib/server/questionCatalog";

export const revalidate = 300;

const SECTION_TITLES: Record<string, string> = {
  math: "Math",
  "reading-writing": "Reading & Writing"
};

export function generateStaticParams() {
  return [{ section: "math" }, { section: "reading-writing" }];
}

type SectionRouteProps = {
  params: Promise<{
    section: string;
  }>;
};

export async function generateMetadata({ params }: SectionRouteProps): Promise<Metadata> {
  const { section } = await params;
  const title = Object.hasOwn(SECTION_TITLES, section) ? SECTION_TITLES[section] : undefined;
  return { title: title ? `${title} · Question Bank` : "Question Bank" };
}

export default async function SectionRoute({ params }: SectionRouteProps) {
  const { section } = await params;
  if (!Object.hasOwn(SECTION_TITLES, section)) notFound();

  const initialCatalog = await getInitialQuestionCatalog();
  return <SectionPracticeSetupPage initialCatalog={initialCatalog} section={section} />;
}
