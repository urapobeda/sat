import { SectionPracticeSetupPage } from "@/components/question-bank/SectionPracticeSetupPage";
import { getInitialQuestionCatalog } from "@/lib/server/questionCatalog";

export const revalidate = 300;

export function generateStaticParams() {
  return [{ section: "math" }, { section: "reading-writing" }];
}

type SectionRouteProps = {
  params: Promise<{
    section: string;
  }>;
};

export default async function SectionRoute({ params }: SectionRouteProps) {
  const { section } = await params;

  const initialCatalog = await getInitialQuestionCatalog();
  return <SectionPracticeSetupPage initialCatalog={initialCatalog} section={section} />;
}
