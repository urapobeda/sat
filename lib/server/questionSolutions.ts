import type { Choice } from "@/types/database";
import type { QuestionFeedback, ReviewQuestion } from "@/types/sat";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PUBLIC_QUESTION_COLUMNS =
  "id,section,topic,difficulty,question,choices,is_bluebook,image_urls,question_type,category,source_name,source_page_start,source_page_end,source_question_id,created_at";

export async function gradeQuestionAnswer({
  questionId,
  selectedAnswer
}: {
  questionId: string;
  selectedAnswer: string | null;
}): Promise<QuestionFeedback> {
  const solution = await getQuestionSolution(questionId);
  const isCorrect =
    selectedAnswer !== null && normalizeAnswer(selectedAnswer) === normalizeAnswer(solution.correct_answer);

  return {
    correctAnswer: solution.correct_answer,
    explanation: solution.explanation,
    isCorrect
  };
}

export async function getReviewQuestions(
  answers: Record<string, string | null>
): Promise<ReviewQuestion[]> {
  const questionIds = Object.keys(answers);

  if (questionIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const [{ data: questionRows, error: questionError }, { data: solutionRows, error: solutionError }] =
    await Promise.all([
      supabase
        .from("questions")
        .select(PUBLIC_QUESTION_COLUMNS)
        .in("id", questionIds),
      supabase
        .from("question_solutions")
        .select("question_id,correct_answer,explanation")
        .in("question_id", questionIds)
    ]);

  if (questionError || solutionError) {
    throw new Error("Unable to load review data.");
  }

  const solutionByQuestionId = new Map(
    (solutionRows ?? []).map((solution) => [solution.question_id, solution])
  );

  return (questionRows ?? [])
    .map((row) => {
      const solution = solutionByQuestionId.get(row.id);

      if (!solution) {
        return null;
      }

      return {
        choices: (row.choices as Choice[]).map((choice) => choice.text),
        correctAnswer: solution.correct_answer,
        difficulty: row.difficulty,
        explanation: solution.explanation,
        id: row.id,
        imageUrls: row.image_urls ?? [],
        isBluebook: row.is_bluebook ?? false,
        question: row.question,
        questionType:
          row.question_type ??
          ((row.choices as Choice[]).length > 0
            ? "multiple-choice"
            : "student-produced-response"),
        section: row.section,
        topic: row.topic
      } satisfies ReviewQuestion;
    })
    .filter((question): question is ReviewQuestion => question !== null)
    .sort((a, b) => questionIds.indexOf(a.id) - questionIds.indexOf(b.id));
}

export async function getQuestionPublicContext(questionId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("questions")
    .select(PUBLIC_QUESTION_COLUMNS)
    .eq("id", questionId)
    .single();

  if (error || !data) {
    throw new Error("Question was not found.");
  }

  const choices = (data.choices as Choice[]).map((choice) => choice.text);

  return {
    choices,
    difficulty: data.difficulty,
    id: data.id,
    imageUrls: data.image_urls ?? [],
    isBluebook: data.is_bluebook ?? false,
    question: data.question,
    questionType:
      data.question_type ??
      (choices.length > 0 ? "multiple-choice" : "student-produced-response"),
    section: data.section,
    topic: data.topic
  };
}

export async function getQuestionSolution(questionId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("question_solutions")
    .select("question_id,correct_answer,explanation")
    .eq("question_id", questionId)
    .single();

  if (error || !data) {
    throw new Error("Question solution is unavailable.");
  }

  return data;
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}
