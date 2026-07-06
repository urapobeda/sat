import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeTopic } from "@/lib/questions";
import type {
  Choice,
  PracticeAnswer,
  PracticeSession,
  Profile,
  Question,
  TestAnswer,
  TestSession
} from "@/types/database";
import type { DifficultyFilter, Question as AppQuestion, SectionFilter } from "@/types/sat";

type QuestionFilters = {
  difficulty?: DifficultyFilter;
  limit?: number;
  section?: SectionFilter;
  topic?: string | null;
};

type SessionResult = {
  percentage: number;
  score: number;
  total: number;
};

export type RecentAttempt = {
  date: string;
  estimatedScore?: number | null;
  id: string;
  mode: "practice" | "test";
  percentage: number;
  score: number;
  section?: string | null;
  timeSpent?: number | null;
  topic?: string | null;
  total: number;
};

export type TopicPerformance = {
  accuracy: number;
  attempts: number;
  correct: number;
  missed: number;
  topic: string;
};

export async function getCurrentUser() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return data.user;
}

export async function ensureProfile(user: User) {
  const supabase = getSupabaseBrowserClient();
  const profile: Pick<Profile, "email" | "full_name" | "id"> = {
    email: user.email ?? null,
    full_name:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null,
    id: user.id
  };
  const { error } = await supabase.from("profiles").upsert(profile, {
    onConflict: "id"
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getProfile(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getQuestions(filters: QuestionFilters = {}) {
  const supabase = getSupabaseBrowserClient();
  let query = supabase.from("questions").select("*").order("created_at");

  if (filters.section && filters.section !== "all") {
    query = query.eq("section", filters.section);
  }

  if (filters.difficulty && filters.difficulty !== "all") {
    query = query.eq("difficulty", filters.difficulty);
  }

  if (filters.limit && !filters.topic) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  let questions = (data ?? []).map(mapQuestionRow);

  if (filters.topic) {
    const topic = normalizeTopic(filters.topic);
    questions = questions.filter(
      (question) => normalizeTopic(question.topic) === topic
    );
  }

  return filters.limit ? questions.slice(0, filters.limit) : questions;
}

export async function getQuestionStats() {
  const questions = await getQuestions();
  const math = questions.filter((question) => question.section === "math").length;
  const readingWriting = questions.filter(
    (question) => question.section === "reading-writing"
  ).length;

  return {
    math,
    readingWriting,
    total: questions.length
  };
}

export async function getTopics() {
  const questions = await getQuestions();
  const topicMap = new Map<
    string,
    { questions: number; section: AppQuestion["section"]; topic: string }
  >();

  questions.forEach((question) => {
    const current = topicMap.get(question.topic);
    if (current) {
      current.questions += 1;
      return;
    }

    topicMap.set(question.topic, {
      questions: 1,
      section: question.section,
      topic: question.topic
    });
  });

  return Array.from(topicMap.values());
}

export async function getQuestionsByTopic(
  section: AppQuestion["section"],
  topic: string
) {
  return getQuestions({ section, topic });
}

export async function getRandomQuestions(
  limit: number,
  filters: QuestionFilters = {}
) {
  const questions = await getQuestions(filters);

  return questions.sort(() => Math.random() - 0.5).slice(0, limit);
}

export async function createPracticeSession(
  data: Pick<PracticeSession, "user_id"> &
    Partial<
      Pick<
        PracticeSession,
        "difficulty" | "percentage" | "score" | "section" | "topic" | "total"
      >
    >
) {
  const supabase = getSupabaseBrowserClient();
  const { data: session, error } = await supabase
    .from("practice_sessions")
    .insert(data)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return session;
}

export async function savePracticeAnswer(
  data: Pick<
    PracticeAnswer,
    "question_id" | "selected_answer" | "session_id" | "user_id"
  > &
    Partial<Pick<PracticeAnswer, "correct_answer" | "is_correct">>
) {
  const supabase = getSupabaseBrowserClient();
  const { data: answer, error } = await supabase
    .from("practice_answers")
    .insert(data)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return answer;
}

export async function completePracticeSession(
  sessionId: string,
  result: SessionResult
) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("practice_sessions")
    .update({
      ...result,
      completed_at: new Date().toISOString()
    })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getPracticeHistory(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createTestSession(
  data: Pick<TestSession, "user_id"> &
    Partial<
      Pick<
        TestSession,
        | "estimated_sat_score"
        | "mode"
        | "percentage"
        | "score"
        | "time_spent_seconds"
        | "total"
      >
    >
) {
  const supabase = getSupabaseBrowserClient();
  const { data: session, error } = await supabase
    .from("test_sessions")
    .insert(data)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return session;
}

export async function saveTestAnswer(
  data: Pick<
    TestAnswer,
    "question_id" | "selected_answer" | "test_session_id" | "user_id"
  > &
    Partial<Pick<TestAnswer, "correct_answer" | "is_correct">>
) {
  const supabase = getSupabaseBrowserClient();
  const { data: answer, error } = await supabase
    .from("test_answers")
    .insert(data)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return answer;
}

export async function completeTestSession(
  testSessionId: string,
  result: SessionResult & {
    estimated_sat_score: number;
    time_spent_seconds: number;
  }
) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("test_sessions")
    .update({
      ...result,
      completed_at: new Date().toISOString()
    })
    .eq("id", testSessionId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getTestHistory(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("test_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getRecentAttempts(userId: string) {
  const [practiceHistory, testHistory] = await Promise.all([
    getPracticeHistory(userId),
    getTestHistory(userId)
  ]);

  const practiceAttempts: RecentAttempt[] = practiceHistory
    .filter((record) => record.completed_at)
    .map((record) => ({
    date: record.completed_at ?? record.started_at,
    id: record.id,
    mode: "practice",
    percentage: Number(record.percentage),
    score: record.score,
    section: record.section,
    topic: record.topic,
    total: record.total
    }));
  const testAttempts: RecentAttempt[] = testHistory
    .filter((record) => record.completed_at)
    .map((record) => ({
    date: record.completed_at ?? record.started_at,
    estimatedScore: record.estimated_sat_score,
    id: record.id,
    mode: "test",
    percentage: Number(record.percentage),
    score: record.score,
    timeSpent: record.time_spent_seconds,
    total: record.total
    }));

  return [...practiceAttempts, ...testAttempts]
    .filter((attempt) => Boolean(attempt.date))
    .sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
}

export async function getUserProgress(userId: string) {
  const attempts = await getRecentAttempts(userId);
  const totalSessions = attempts.length;
  const questionsAnswered = attempts.reduce((sum, attempt) => sum + attempt.total, 0);
  const averageAccuracy =
    totalSessions > 0
      ? Math.round(
          attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) /
            totalSessions
        )
      : 0;
  const bestTestScore = Math.max(
    0,
    ...attempts
      .filter((attempt) => attempt.mode === "test")
      .map((attempt) => attempt.estimatedScore ?? 0)
  );

  return {
    attempts,
    averageAccuracy,
    bestTestScore,
    questionsAnswered,
    totalSessions
  };
}

export async function getWeakAreas(userId: string) {
  const performance = await getTopicPerformance(userId);

  return performance
    .filter((topic) => topic.missed > 0)
    .sort((a, b) => b.missed - a.missed || a.accuracy - b.accuracy)
    .slice(0, 5)
    .map((topic) => ({
      count: topic.missed,
      topic: topic.topic
    }));
}

export async function getStrongAreas(userId: string) {
  const performance = await getTopicPerformance(userId);

  return performance
    .filter((topic) => topic.correct > 0)
    .sort((a, b) => b.accuracy - a.accuracy || b.correct - a.correct)
    .slice(0, 5);
}

export async function getTopicPerformance(userId: string): Promise<TopicPerformance[]> {
  const supabase = getSupabaseBrowserClient();
  const { data: practiceAnswers, error: practiceError } = await supabase
    .from("practice_answers")
    .select("question_id,is_correct")
    .eq("user_id", userId)
    .not("is_correct", "is", null);
  const { data: testAnswers, error: testError } = await supabase
    .from("test_answers")
    .select("question_id,is_correct")
    .eq("user_id", userId)
    .not("is_correct", "is", null);

  if (practiceError || testError) {
    throw new Error(practiceError?.message ?? testError?.message ?? "Progress error");
  }

  const answers = [
    ...(practiceAnswers ?? []),
    ...(testAnswers ?? [])
  ];
  const questionIds = Array.from(new Set(answers.map((answer) => answer.question_id)));

  if (questionIds.length === 0) {
    return [];
  }

  const { data: answeredQuestions, error } = await supabase
    .from("questions")
    .select("id,topic")
    .in("id", questionIds);

  if (error) {
    throw new Error(error.message);
  }

  const topicByQuestionId = new Map(
    (answeredQuestions ?? []).map((question) => [question.id, question.topic])
  );
  const counts = new Map<string, { correct: number; missed: number }>();

  answers.forEach((answer) => {
    const topic = topicByQuestionId.get(answer.question_id);

    if (!topic) {
      return;
    }

    const current = counts.get(topic) ?? { correct: 0, missed: 0 };

    if (answer.is_correct) {
      current.correct += 1;
    } else {
      current.missed += 1;
    }

    counts.set(topic, current);
  });

  return Array.from(counts.entries())
    .map(([topic, count]) => {
      const attempts = count.correct + count.missed;

      return {
        accuracy: attempts > 0 ? Math.round((count.correct / attempts) * 100) : 0,
        attempts,
        correct: count.correct,
        missed: count.missed,
        topic
      };
    })
    .sort((a, b) => b.attempts - a.attempts);
}

export async function clearUserProgress(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const deleteOperations = [
    supabase.from("practice_answers").delete().eq("user_id", userId),
    supabase.from("test_answers").delete().eq("user_id", userId),
    supabase.from("practice_sessions").delete().eq("user_id", userId),
    supabase.from("test_sessions").delete().eq("user_id", userId)
  ];

  const results = await Promise.all(deleteOperations);
  const error = results.find((result) => result.error)?.error;

  if (error) {
    throw new Error(error.message);
  }
}

function mapQuestionRow(row: Question): AppQuestion {
  return {
    choices: row.choices.map((choice: Choice) => choice.text),
    correctAnswer: row.correct_answer,
    difficulty: row.difficulty,
    explanation: row.explanation,
    id: row.id,
    question: row.question,
    section: row.section,
    topic: row.topic
  };
}
