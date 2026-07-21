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
  correct_answer: string;
  created_at: string;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
  id: string;
  is_bluebook: boolean;
  question: string;
  section: "math" | "reading-writing";
  topic: string;
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
      questions: {
        Insert: Partial<Question> &
          Pick<
            Question,
            | "choices"
            | "correct_answer"
            | "difficulty"
            | "explanation"
            | "question"
            | "section"
            | "topic"
          >;
        Relationships: [];
        Row: Question;
        Update: Partial<Question>;
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
