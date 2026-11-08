export type SatSection = "math" | "reading-writing";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export type QuestionChoice = {
  /** "A"-"D"; this is the value a student submits for a multiple-choice question */
  label: string;
  /** text with LaTeX in \( \) and Markdown tables; may be empty when the choice is a graph */
  text: string;
  imageUrl: string | null;
};

export type Question = {
  choices: QuestionChoice[];
  difficulty: QuestionDifficulty;
  id: string;
  imageUrls: string[];
  isBluebook: boolean;
  question: string;
  questionType: "multiple-choice" | "student-produced-response";
  section: SatSection;
  topic: string;
};

export type QuestionFeedback = {
  correctAnswer: string;
  /** label of the correct choice for multiple-choice questions */
  correctLabel: string | null;
  explanation: string;
  isCorrect: boolean;
};

export type ReviewQuestion = Question & {
  correctAnswer: string;
  correctLabel: string | null;
  /** graded on the server (numbers compared by value, any accepted form counts) */
  isCorrect?: boolean;
  explanation: string;
};

export type SectionFilter = "all" | SatSection;

export type DifficultyFilter = "all" | QuestionDifficulty;
