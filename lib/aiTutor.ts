import type { Question } from "@/types/sat";

export const AI_TUTOR_DAILY_LIMIT = 30;

export type AITutorAction =
  | "hint"
  | "next-step"
  | "explain"
  | "explain-mistake"
  | "ask";

export type AITutorRequest = {
  action: AITutorAction;
  contextType: "past-paper-review" | "practice" | "test-review";
  message: string;
  questionId: string;
  selectedAnswer?: string;
};

export type AITutorResponse = {
  dailyUsage?: { count: number; limit: number };
  followUpQuestion: string | null;
  message: string;
  steps: string[];
  title: string;
};

export type AITutorChatMessage = {
  content: string;
  id: string;
  response?: AITutorResponse;
  role: "user" | "assistant";
};

export function createTutorRequest({
  action,
  hasSubmitted: submittedOverride,
  message,
  question,
  selectedAnswer
}: {
  action: AITutorAction;
  hasSubmitted?: boolean;
  message: string;
  question: Question;
  selectedAnswer: string | null;
}): AITutorRequest {
  const hasSubmitted = submittedOverride ?? selectedAnswer !== null;

  return {
    action,
    contextType: hasSubmitted ? "test-review" : "practice",
    message,
    questionId: question.id,
    selectedAnswer: selectedAnswer ?? undefined,
  };
}
