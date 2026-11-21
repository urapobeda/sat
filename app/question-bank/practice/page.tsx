import { Suspense } from "react";
import { QuestionBankPracticePage } from "@/components/question-bank/practice/QuestionBankPracticePage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Practice" };

export default function QuestionBankPracticeRoute() {
  return (
    <Suspense>
      <QuestionBankPracticePage />
    </Suspense>
  );
}
