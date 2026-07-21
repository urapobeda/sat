export type SatSection = "math" | "reading-writing";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export type Question = {
  choices: string[];
  correctAnswer: string;
  difficulty: QuestionDifficulty;
  explanation: string;
  id: string;
  isBluebook: boolean;
  question: string;
  section: SatSection;
  topic: string;
};

export type SectionFilter = "all" | SatSection;

export type DifficultyFilter = "all" | QuestionDifficulty;
