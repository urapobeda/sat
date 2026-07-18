import type { Question } from "@/types/sat";

export const AI_TUTOR_SESSION_LIMIT = 20;
export const AI_TUTOR_QUESTION_LIMIT = 10;

export type AITutorAction =
  | "hint"
  | "next-step"
  | "explain"
  | "explain-mistake"
  | "ask";

export type AITutorRequest = {
  action: AITutorAction;
  choices: string[];
  correctAnswer?: string;
  difficulty: string;
  explanation?: string;
  hasSubmitted: boolean;
  message: string;
  question: string;
  section: string;
  selectedAnswer?: string;
  topic: string;
};

export type AITutorResponse = {
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
    choices: question.choices,
    correctAnswer: hasSubmitted ? question.correctAnswer : undefined,
    difficulty: question.difficulty,
    explanation: hasSubmitted ? question.explanation : undefined,
    hasSubmitted,
    message,
    question: question.question,
    section: question.section,
    selectedAnswer: selectedAnswer ?? undefined,
    topic: question.topic
  };
}
