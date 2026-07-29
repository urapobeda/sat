export type Choice = {
  label: string;
  text: string;
};

export type Profile = {
  created_at: string;
  email: string | null;
  full_name: string | null;
  id: string;
};

export type Question = {
  choices: Choice[];
  created_at: string;
  difficulty: "easy" | "medium" | "hard";
  id: string;
  is_bluebook: boolean;
  question: string;
  section: "math" | "reading-writing";
  topic: string;
};

export type QuestionSolution = {
  correct_answer: string;
  created_at: string;
  explanation: string;
  question_id: string;
  scoring_metadata: Record<string, unknown> | null;
  solution_steps: unknown[] | null;
  updated_at: string;
};

export type QuestionMark = {
  marked_at: string;
  question_id: string;
  user_id: string;
};

export type PracticeSession = {
  completed_at: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  id: string;
  percentage: number;
  score: number;
  section: "math" | "reading-writing" | null;
  started_at: string;
  topic: string | null;
  total: number;
  user_id: string;
};

export type PracticeAnswer = {
  correct_answer: string | null;
  created_at: string;
  id: string;
  is_correct: boolean | null;
  question_id: string;
  selected_answer: string | null;
  session_id: string;
  user_id: string;
};

export type TestSession = {
  completed_at: string | null;
  estimated_sat_score: number | null;
  id: string;
  mode: string;
  percentage: number;
  score: number;
  started_at: string;
  time_spent_seconds: number | null;
  total: number;
  user_id: string;
};

export type TestAnswer = {
  correct_answer: string | null;
  created_at: string;
  id: string;
  is_correct: boolean | null;
  question_id: string;
  selected_answer: string | null;
  test_session_id: string;
  user_id: string;
};

export type StudyPlan = {
  created_at: string;
  daily_goal: number;
  exam_date: string;
  id: string;
  target_score: number;
  updated_at: string;
  user_id: string;
  weekly_goal: number;
};

export type ExamPaper = {
  created_at: string;
  description: string | null;
  difficulty: "foundation" | "standard" | "advanced";
  estimated_minutes: number | null;
  id: string;
  is_featured: boolean;
  is_published: boolean;
  license_notes: string | null;
  mode: "adaptive" | "linear" | "untimed-practice";
  paper_type: "full-length" | "reading-writing" | "math" | "mini-test";
  slug: string;
  source_name: string | null;
  source_type: "original" | "licensed" | "public-permission";
  source_url: string | null;
  title: string;
  updated_at: string;
  year: number | null;
};

export type ExamModule = {
  duration_seconds: number;
  id: string;
  module_number: number;
  paper_id: string;
  question_count: number;
  route_type: "base" | "easier" | "harder" | null;
  section: "math" | "reading-writing";
  sort_order: number;
};

export type ExamModuleQuestion = {
  id: string;
  module_id: string;
  question_id: string;
  sort_order: number;
};

export type ExamAttempt = {
  completed_at: string | null;
  current_module_id: string | null;
  current_question_index: number;
  estimated_score: number | null;
  id: string;
  math_score: number | null;
  paper_id: string;
  raw_score: number | null;
  reading_writing_score: number | null;
  selected_section: "math" | "reading-writing" | "full" | null;
  started_at: string;
  status: "not-started" | "in-progress" | "completed";
  time_spent_seconds: number;
  user_id: string;
};

export type ExamAttemptAnswer = {
  answered_at: string;
  attempt_id: string;
  id: string;
  is_correct: boolean | null;
  marked_for_review: boolean;
  module_id: string;
  question_id: string;
  selected_answer: string | null;
  time_spent_seconds: number;
  user_id: string;
};

export type PaperBookmark = {
  created_at: string;
  paper_id: string;
  user_id: string;
};

export type Database = {
  public: {
    Tables: {
      practice_answers: {
        Insert: Partial<PracticeAnswer> &
          Pick<PracticeAnswer, "question_id" | "session_id" | "user_id">;
        Relationships: [];
        Row: PracticeAnswer;
        Update: Partial<PracticeAnswer>;
      };
      practice_sessions: {
        Insert: Partial<PracticeSession> & Pick<PracticeSession, "user_id">;
        Relationships: [];
        Row: PracticeSession;
        Update: Partial<PracticeSession>;
      };
      profiles: {
        Insert: Partial<Profile> & Pick<Profile, "id">;
        Relationships: [];
        Row: Profile;
        Update: Partial<Profile>;
      };
      study_plans: {
        Insert: Partial<StudyPlan> & Pick<StudyPlan, "user_id">;
        Relationships: [];
        Row: StudyPlan;
        Update: Partial<StudyPlan>;
      };
      exam_attempt_answers: {
        Insert: Partial<ExamAttemptAnswer> &
          Pick<
            ExamAttemptAnswer,
            "attempt_id" | "module_id" | "question_id" | "user_id"
          >;
        Relationships: [];
        Row: ExamAttemptAnswer;
        Update: Partial<ExamAttemptAnswer>;
      };
      exam_attempts: {
        Insert: Partial<ExamAttempt> &
          Pick<ExamAttempt, "paper_id" | "status" | "user_id">;
        Relationships: [];
        Row: ExamAttempt;
        Update: Partial<ExamAttempt>;
      };
      exam_module_questions: {
        Insert: Partial<ExamModuleQuestion> &
          Pick<ExamModuleQuestion, "module_id" | "question_id" | "sort_order">;
        Relationships: [];
        Row: ExamModuleQuestion;
        Update: Partial<ExamModuleQuestion>;
      };
      exam_modules: {
        Insert: Partial<ExamModule> &
          Pick<
            ExamModule,
            | "duration_seconds"
            | "module_number"
            | "paper_id"
            | "question_count"
            | "section"
            | "sort_order"
          >;
        Relationships: [];
        Row: ExamModule;
        Update: Partial<ExamModule>;
      };
      exam_papers: {
        Insert: Partial<ExamPaper> &
          Pick<
            ExamPaper,
            | "difficulty"
            | "mode"
            | "paper_type"
            | "slug"
            | "source_type"
            | "title"
          >;
        Relationships: [];
        Row: ExamPaper;
        Update: Partial<ExamPaper>;
      };
      paper_bookmarks: {
        Insert: Pick<PaperBookmark, "paper_id" | "user_id"> &
          Partial<Pick<PaperBookmark, "created_at">>;
        Relationships: [];
        Row: PaperBookmark;
        Update: Partial<PaperBookmark>;
      };
      questions: {
        Insert: Partial<Question> &
          Pick<
            Question,
            | "choices"
            | "difficulty"
            | "question"
            | "section"
            | "topic"
          >;
        Relationships: [];
        Row: Question;
        Update: Partial<Question>;
      };
      question_solutions: {
        Insert: Pick<
          QuestionSolution,
          "correct_answer" | "explanation" | "question_id"
        > &
          Partial<
            Pick<
              QuestionSolution,
              "created_at" | "scoring_metadata" | "solution_steps" | "updated_at"
            >
          >;
        Relationships: [];
        Row: QuestionSolution;
        Update: Partial<QuestionSolution>;
      };
      question_marks: {
        Insert: Pick<QuestionMark, "question_id" | "user_id"> &
          Partial<Pick<QuestionMark, "marked_at">>;
        Relationships: [];
        Row: QuestionMark;
        Update: Partial<QuestionMark>;
      };
      test_answers: {
        Insert: Partial<TestAnswer> &
          Pick<TestAnswer, "question_id" | "test_session_id" | "user_id">;
        Relationships: [];
        Row: TestAnswer;
        Update: Partial<TestAnswer>;
      };
      test_sessions: {
        Insert: Partial<TestSession> & Pick<TestSession, "user_id">;
        Relationships: [];
        Row: TestSession;
        Update: Partial<TestSession>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
