import { SectionPracticeSetupPage } from "@/components/question-bank/SectionPracticeSetupPage";

type SectionRouteProps = {
  params: Promise<{
    section: string;
  }>;
};

export default async function SectionRoute({ params }: SectionRouteProps) {
  const { section } = await params;

  return <SectionPracticeSetupPage section={section} />;
}
