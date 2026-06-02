import { Suspense } from "react";
import { QuestionBankPracticePage } from "@/components/question-bank/practice/QuestionBankPracticePage";

export default function QuestionBankPracticeRoute() {
  return (
    <Suspense>
      <QuestionBankPracticePage />
    </Suspense>
  );
}
