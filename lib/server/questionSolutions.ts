import type { Choice } from "@/types/database";
import type { QuestionChoice, QuestionFeedback, ReviewQuestion } from "@/types/sat";
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
  const grading = (await loadGradingData([questionId])).get(questionId);

  if (!grading) {
    throw new Error("Question solution is unavailable.");
  }

  return {
    correctAnswer: grading.correctAnswer,
    correctLabel: grading.correctLabel,
    explanation: grading.explanation,
    isCorrect: isAnswerCorrect(grading, selectedAnswer)
  };
}

export type GradingData = {
  acceptedAnswers: string[];
  choices: Choice[];
  /** what to show as "Correct answer": the letter, or the main typed answer */
  correctAnswer: string;
  correctLabel: string | null;
  explanation: string;
  questionType: "multiple-choice" | "student-produced-response";
  rawCorrectAnswer: string;
};

export async function loadGradingData(questionIds: string[]) {
  const result = new Map<string, GradingData>();

  if (questionIds.length === 0) {
    return result;
  }

  const supabase = getSupabaseAdminClient();
  const [{ data: questionRows, error: questionError }, { data: solutionRows, error: solutionError }] =
    await Promise.all([
      supabase.from("questions").select("id,choices,question_type").in("id", questionIds),
      supabase
        .from("question_solutions")
        .select("question_id,correct_answer,explanation,scoring_metadata")
        .in("question_id", questionIds)
    ]);

  if (questionError || solutionError) {
    throw new Error("Unable to load grading data.");
  }

  const questionById = new Map((questionRows ?? []).map((row) => [row.id, row]));

  for (const solution of solutionRows ?? []) {
    const question = questionById.get(solution.question_id);
    const choices = ((question?.choices ?? []) as Choice[]).filter(Boolean);
    const questionType =
      question?.question_type ?? (choices.length > 0 ? "multiple-choice" : "student-produced-response");
    const correctLabel = questionType === "multiple-choice" ? findCorrectLabel(choices, solution.correct_answer) : null;
    const metadata = (solution.scoring_metadata ?? {}) as { accepted_answers?: unknown };
    const acceptedAnswers = Array.isArray(metadata.accepted_answers)
      ? metadata.accepted_answers.filter((answer): answer is string => typeof answer === "string")
      : [];

    result.set(solution.question_id, {
      acceptedAnswers,
      choices,
      correctAnswer: correctLabel ?? solution.correct_answer,
      correctLabel,
      explanation: solution.explanation,
      questionType,
      rawCorrectAnswer: solution.correct_answer
    });
  }

  return result;
}

/**
 * Multiple-choice: the student submits a label ("A"-"D"). Older Reading & Writing
 * rows store the correct choice's text instead of its letter; both work.
 * Student-produced response: any accepted form counts, and numbers are compared
 * by value, so 3/4, .75 and 0.75 are the same answer.
 */
export function isAnswerCorrect(grading: GradingData, selectedAnswer: string | null) {
  if (selectedAnswer === null || !selectedAnswer.trim()) {
    return false;
  }

  if (grading.questionType === "multiple-choice") {
    const selectedLabel =
      grading.choices.find((choice) => normalizeAnswer(choice.label) === normalizeAnswer(selectedAnswer))?.label ??
      grading.choices.find((choice) => normalizeAnswer(choice.text) === normalizeAnswer(selectedAnswer))?.label ??
      null;

    return selectedLabel !== null && selectedLabel === grading.correctLabel;
  }

  const accepted = [grading.rawCorrectAnswer, ...grading.acceptedAnswers];
  return accepted.some((answer) => sameStudentAnswer(answer, selectedAnswer));
}

function findCorrectLabel(choices: Choice[], correctAnswer: string) {
  const normalized = normalizeAnswer(correctAnswer).replace(/\.$/, "");

  return (
    choices.find((choice) => normalizeAnswer(choice.label) === normalized)?.label ??
    choices.find((choice) => normalizeAnswer(choice.text) === normalizeAnswer(correctAnswer))?.label ??
    null
  );
}

function sameStudentAnswer(expected: string, given: string) {
  const left = parseNumber(expected);
  const right = parseNumber(given);

  if (left !== null && right !== null) {
    return Math.abs(left - right) < 1e-9;
  }

  return normalizeAnswer(expected) === normalizeAnswer(given);
}

function parseNumber(value: string) {
  const text = value.trim().replace(/\u2212/g, "-").replace(/\s+/g, "");
  const fraction = text.match(/^(-?\d*\.?\d+)\/(-?\d*\.?\d+)$/);

  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : Number(fraction[1]) / denominator;
  }

  return /^-?\d*\.?\d+$/.test(text) ? Number(text) : null;
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
  const gradingById = await loadGradingData(questionIds);

  if (questionError || solutionError) {
    throw new Error("Unable to load review data.");
  }

  const solutionByQuestionId = new Map(
    (solutionRows ?? []).map((solution) => [solution.question_id, solution])
  );

  return (questionRows ?? [])
    .map((row): ReviewQuestion | null => {
      const solution = solutionByQuestionId.get(row.id);

      if (!solution) {
        return null;
      }

      const grading = gradingById.get(row.id);

      return {
        choices: toQuestionChoices(row.choices as Choice[]),
        correctAnswer: grading?.correctAnswer ?? solution.correct_answer,
        correctLabel: grading?.correctLabel ?? null,
        isCorrect: grading ? isAnswerCorrect(grading, answers[row.id] ?? null) : false,
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
      };
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

  const choices = toQuestionChoices(data.choices as Choice[]);

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

export function toQuestionChoices(choices: Choice[]): QuestionChoice[] {
  return (choices ?? []).map((choice, index) => ({
    imageUrl: choice.image_url ?? null,
    label: choice.label || String.fromCharCode(65 + index),
    text: choice.text ?? ""
  }));
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}
