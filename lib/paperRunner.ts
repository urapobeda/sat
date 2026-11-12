export type PaperItem = {
  id: string;
  module_id: string;
  position: number;
  question_type: "multiple-choice" | "student-produced-response";
  text: string;
  image_paths: string[];
};

export type PaperSolution = {
  item_id: string;
  accepted_answers: string[];
};

export type PaperModuleRun = {
  attempt_id: string;
  module_id: string;
  ordinal: number;
  answers: Record<string, string>;
  flags: Record<string, boolean>;
  current_index: number;
  revision: number;
  started_at: string | null;
  deadline: string | null;
  completed_at: string | null;
  score: number | null;
  graded: Record<string, boolean> | null;
};

export type PaperRunnerSnapshot = {
  userId: string;
  title: string;
  attemptId: string;
  completed: boolean;
  modules: Array<{
    id: string;
    section: "math" | "reading-writing";
    module_number: number;
    question_count: number;
    run: PaperModuleRun;
  }>;
  current: string | null;
  items: Array<PaperItem & { images: string[] }>;
  review: Array<{ id: string; position: number; selected: string; accepted: string[]; correct: boolean }>;
};
