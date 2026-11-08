import { QuestionBankPage } from "@/components/question-bank/QuestionBankPage";
import { getInitialQuestionCatalog } from "@/lib/server/questionCatalog";

export const revalidate = 300;

export default async function QuestionBankRoute() {
  const initialCatalog = await getInitialQuestionCatalog();
  return <QuestionBankPage initialCatalog={initialCatalog} />;
}
