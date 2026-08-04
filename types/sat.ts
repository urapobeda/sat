export type SatSection = "math" | "reading-writing";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export type Question = {
  choices: string[];
  difficulty: QuestionDifficulty;
  id: string;
  isBluebook: boolean;
  question: string;
  questionType: "multiple-choice" | "student-produced-response";
  section: SatSection;
  topic: string;
};

export type QuestionFeedback = {
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean;
};

export type ReviewQuestion = Question & {
  correctAnswer: string;
  explanation: string;
};

export type SectionFilter = "all" | SatSection;

export type DifficultyFilter = "all" | QuestionDifficulty;
