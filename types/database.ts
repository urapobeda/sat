import type { AssignmentFeedback, ReportRow } from "@/lib/assignmentReport";
import type { Lesson, LessonItem, LessonRow, LessonHomework } from "@/lib/lessons";
import type { VocabularyRecord, VocabularyWord } from "@/lib/vocabulary";
import type { LiveSession, LiveAnswer, LiveRoster } from "@/lib/liveLessons";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
import type { StudyGroup, GroupMember, GroupTeacher } from "@/lib/groups";
import type { UserRole } from "@/lib/roles";
import type { PaperItem, PaperSolution, PaperModuleRun } from "./../lib/paperRunner";
import type {
  AssignmentAnswer,
  AssignmentKind,
  AssignmentQuestionRow,
  AssignmentRosterRow,
  AssignmentSubmission,
  ShowAnswersRule,
  StudentAssignment,
  TeacherAssignment
} from "@/lib/homework";
export type Choice = {
  label: string;
  text: string;
  image_url?: string | null;
};

export type Profile = {
  target_score: number | null;
  sat_date: string | null;
  school: string | null;
  grade: string | null;
  telegram: string | null;
  about: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  email: string | null;
  full_name: string | null;
  id: string;
};

export type Question = {
  category: string | null;
  choices: Choice[];
  created_at: string;
  difficulty: "easy" | "medium" | "hard";
  id: string;
  image_urls: string[];
  is_bluebook: boolean;
  question: string;
  question_type: "multiple-choice" | "student-produced-response";
  section: "math" | "reading-writing";
  source_name: string | null;
  source_page_end: number | null;
  source_page_start: number | null;
  source_question_id: string | null;
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

export type QuestionReportReason = "incorrect_answer" | "typo" | "display" | "other";

type QuestionReport = {
  id: string;
  question_id: string;
  reporter_id: string;
  reason: QuestionReportReason;
  details: string;
  created_at: string;
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
  time_spent_seconds: number | null;
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

export type Assignment = {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  instructions: string;
  kind: AssignmentKind;
  paper_id: string | null;
  time_limit_minutes: number | null;
  due_at: string | null;
  lesson_id: string | null;
  lesson_part: "classwork" | "homework" | null;
  lesson_request_id: string | null;
  show_answers: ShowAnswersRule;
  max_attempts: number;
  published: boolean;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      live_sessions: { Row: LiveSession; Insert: never; Update: never; Relationships: [] };
      live_answers: { Row: LiveAnswer; Insert: never; Update: never; Relationships: [] };
      live_session_roster: { Row: LiveRoster; Insert: never; Update: never; Relationships: [] };
      vocabulary_words: { Row: VocabularyRecord; Insert: Pick<VocabularyRecord, "word" | "definition_en" | "translation_ru" | "created_by"> & Partial<Pick<VocabularyRecord, "group_id" | "lesson_id" | "part_of_speech" | "example">>; Update: Partial<Pick<VocabularyRecord, "word" | "definition_en" | "translation_ru" | "group_id" | "lesson_id" | "part_of_speech" | "example">>; Relationships: [] };
      lessons: { Row: Lesson; Insert: Omit<Lesson, "id" | "created_at">; Update: Partial<Pick<Lesson, "title" | "section" | "topic" | "starts_at" | "position" | "notes">>; Relationships: [] };
      lesson_items: { Row: LessonItem; Insert: Omit<LessonItem, "id">; Update: Partial<Omit<LessonItem, "id">>; Relationships: [] };
      assignment_feedback: {
        Row: AssignmentFeedback;
        Insert: Pick<AssignmentFeedback, "submission_id" | "author_id" | "body"> & Partial<Pick<AssignmentFeedback, "id" | "question_id">>;
        Update: never; Relationships: [];
      };
      assignment_retake_grants: {
        Row: { submission_id: string; assignment_id: string; student_id: string; granted_by: string; created_at: string };
        Insert: never; Update: never; Relationships: [];
      };
      assignments: {
        Row: Assignment;
        Insert: Pick<Assignment, "group_id" | "created_by" | "title" | "kind" | "due_at"> &
          Partial<Pick<Assignment, "instructions" | "paper_id" | "time_limit_minutes" | "show_answers" | "max_attempts" | "published">>;
        Update: Partial<Omit<Assignment, "id" | "group_id" | "created_by" | "created_at">>;
        Relationships: [];
      };
      assignment_questions: {
        Row: AssignmentQuestionRow;
        Insert: AssignmentQuestionRow;
        Update: Partial<AssignmentQuestionRow>;
        Relationships: [];
      };
      assignment_submissions: {
        Row: AssignmentSubmission;
        Insert: Partial<AssignmentSubmission> & Pick<AssignmentSubmission, "assignment_id" | "student_id">;
        Update: Partial<AssignmentSubmission>;
        Relationships: [];
      };
      assignment_answers: {
        Row: AssignmentAnswer;
        Insert: Partial<AssignmentAnswer> & Pick<AssignmentAnswer, "submission_id" | "question_id">;
        Update: Partial<AssignmentAnswer>;
        Relationships: [];
      };
      groups: {
        Row: Omit<StudyGroup, "teacher_name" | "member_count">;
        Insert: never;
        Update: { name?: string; archived?: boolean; teacher_id?: string };
        Relationships: [];
      };
      group_members: {
        Row: { group_id: string; student_id: string; joined_at: string };
        Insert: never; Update: never; Relationships: [];
      };
      ai_tutor_usage: {
        Row: { user_id: string; date: string; count: number };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      paper_items: {
        Row: PaperItem;
        Insert: PaperItem;
        Update: Partial<PaperItem>;
        Relationships: [];
      };
      paper_solutions: {
        Row: PaperSolution;
        Insert: PaperSolution;
        Update: Partial<PaperSolution>;
        Relationships: [];
      };
      paper_module_runs: {
        Row: PaperModuleRun;
        Insert: Partial<PaperModuleRun> & Pick<PaperModuleRun, "attempt_id" | "module_id" | "ordinal">;
        Update: Partial<PaperModuleRun>;
        Relationships: [];
      };
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
      teacher_notes: {
        Row: {id:string;student_id:string;author_id:string;body:string;created_at:string};
        Insert: {student_id:string;author_id:string;body:string};
        Update: {body?:string};
        Relationships: [];
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
      question_reports: {
        Row: QuestionReport;
        Insert: Pick<QuestionReport, "question_id" | "reason"> & Partial<Pick<QuestionReport, "details">>;
        Update: never;
        Relationships: [];
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
    Functions: {
      start_live_lesson: { Args: { p_lesson: string }; Returns: string };
      control_live_lesson: { Args: { p_code: string; p_action: string; p_position: number }; Returns: undefined };
      submit_verified_live_answer: { Args: { p_student: string; p_session: string; p_question: string; p_choice: string; p_correct: boolean }; Returns: undefined };
      get_live_snapshot: { Args: { p_code: string }; Returns: Json };
      list_my_live_sessions: { Args: { p_lesson?: string; p_active?: boolean }; Returns: LiveSession[] };
      question_in_active_live: { Args: { p_student: string; p_question: string }; Returns: boolean };
      list_vocabulary_words: { Args: Record<string, never>; Returns: VocabularyWord[] };
      add_vocabulary_batch: { Args: { p_group_id: string | null; p_lesson_id: string | null; p_rows: Json }; Returns: { inserted: number; skipped: number }[] };
      save_lesson: { Args: { p_id: string | null; p_group_id: string; p_title: string; p_section: string; p_topic: string; p_starts_at: string | null; p_position: number; p_notes: string; p_items: Json }; Returns: string };
      list_my_lessons: { Args: { p_group_id?: string; p_scheduled?: boolean }; Returns: LessonRow[] };
      list_my_lesson_assignments: { Args: Record<string, never>; Returns: LessonHomework[] };
      assign_lesson_part: { Args: { p_lesson: string; p_part: string; p_due_at: string | null; p_comment: string; p_request_id: string }; Returns: { id: string; student_count: number }[] };
      refresh_my_assignment_deadlines: { Args: Record<string, never>; Returns: undefined };
      expire_assignment_attempt: { Args: { p_user: string; p_submission: string }; Returns: boolean };
      assignment_answers_released: { Args: { p_assignment: string; p_student: string }; Returns: boolean };
      duplicate_assignment: { Args: { p_assignment: string }; Returns: string };
      question_in_pending_homework: { Args: { p_user: string; p_question: string }; Returns: boolean };
      can_view_student: { Args: { p_student: string }; Returns: boolean };
      teacher_student_ids: { Args: Record<string, never>; Returns: {student_id:string}[] };
      search_teacher_students: { Args: {p_query:string}; Returns: {student_id:string}[] };
      student_profile_groups: { Args: {p_student:string}; Returns: {id:string;name:string;teacher_name:string}[] };
      grant_assignment_retake: { Args: { p_submission: string }; Returns: number };
      get_assignment_report_rows: { Args: { p_assignment: string }; Returns: ReportRow[] };
      list_my_assignment_feedback: { Args: Record<string, never>; Returns: { assignment_id: string; submission_id: string }[] };
      save_verified_assignment_answer: { Args: { p_user: string; p_submission: string; p_question: string; p_answer: string | null; p_correct: boolean | null; p_seconds: number | null }; Returns: undefined };
      finalize_assignment_submission: { Args: { p_user: string; p_submission: string }; Returns: undefined };
      create_group: { Args: { p_name: string }; Returns: string };
      join_group_by_code: { Args: { code: string }; Returns: string };
      rotate_group_code: { Args: { p_group_id: string }; Returns: string };
      list_my_groups: { Args: { p_group_id?: string }; Returns: StudyGroup[] };
      get_group_members: { Args: { p_group_id: string }; Returns: GroupMember[] };
      list_group_teachers: { Args: Record<string, never>; Returns: GroupTeacher[] };
      can_manage_group: { Args: { p_group_id: string }; Returns: boolean };
      is_group_member: { Args: { p_group_id: string }; Returns: boolean };
      current_user_role: { Args: Record<string, never>; Returns: UserRole };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      admin_list_users: {
        Args: { p_search?: string; p_offset?: number };
        Returns: { id: string; full_name: string | null; email: string | null; role: UserRole; created_at: string; total_count: number }[];
      };
      admin_set_user_role: {
        Args: { p_actor_id: string; p_user_id: string; p_role: UserRole };
        Returns: undefined;
      };
      consume_ai_tutor_usage: {
        Args: { p_user_id: string };
        Returns: number | null;
      };
      open_paper_attempt: {
        Args: { p_user: string; p_slug: string; p_section: string };
        Returns: string;
      };
      update_paper_attempt: {
        Args: {
          p_user: string; p_attempt: string; p_module: string; p_revision: number;
          p_answers: Record<string, string>; p_flags: Record<string, boolean>;
          p_index: number; p_submit: boolean; p_graded: Record<string, boolean>;
        };
        Returns: boolean;
      };
      can_manage_assignment: { Args: { p_assignment_id: string }; Returns: boolean };
      set_assignment_questions: { Args: { p_assignment_id: string; p_question_ids: string[] }; Returns: boolean };
      start_assignment_attempt: { Args: { p_user: string; p_assignment: string }; Returns: string };
      list_student_assignments: { Args: Record<string, never>; Returns: StudentAssignment[] };
      list_teacher_assignments: { Args: { p_group_id?: string }; Returns: TeacherAssignment[] };
      get_assignment_roster: { Args: { p_assignment_id: string }; Returns: AssignmentRosterRow[] };
      finalize_verified_test: {
        Args: {
          p_session: string;
          p_user: string;
          p_answers: { question_id: string; selected_answer: string | null; correct_answer: string; is_correct: boolean }[];
          p_estimate: number;
          p_percentage: number;
          p_score: number;
          p_seconds: number;
        };
        Returns: boolean;
      };
    };
    Enums: { user_role: UserRole };
    CompositeTypes: Record<string, never>;
  };
};
