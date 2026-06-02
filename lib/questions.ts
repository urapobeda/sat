import type { Question } from "@/data/questions";

export type SectionFilter = "all" | Question["section"];
export type DifficultyFilter = "all" | Question["difficulty"];

export type TopicSummary = {
  description: string;
  mastery: number;
  questions: number;
  section: Question["section"];
  title: string;
};

const topicDescriptions: Record<string, string> = {
  Algebra: "Linear equations, inequalities, systems",
  "Advanced Math": "Functions, sequences, complex expressions",
  "Problem Solving & Data Analysis": "Ratios, rates, statistics, word problems",
  "Geometry & Trigonometry": "Triangles, circles, area, trigonometric ratios",
  "Grammar & Conventions": "Punctuation, agreement, sentence boundaries",
  Transitions: "Logical connections between ideas",
  "Vocabulary in Context": "Word meaning, tone, and usage",
  "Reading Comprehension": "Main idea, inference, evidence",
  "Text Structure": "Paragraph logic, organization, conclusions"
};

const masteryByTopic: Record<string, number> = {
  Algebra: 72,
  "Advanced Math": 61,
  "Problem Solving & Data Analysis": 58,
  "Geometry & Trigonometry": 49,
  "Grammar & Conventions": 64,
  Transitions: 42,
  "Vocabulary in Context": 57,
  "Reading Comprehension": 52,
  "Text Structure": 51
};

export function filterQuestions(
  questions: Question[],
  filters: {
    difficulty?: DifficultyFilter;
    section?: SectionFilter;
    topic?: string | null;
  }
) {
  const section = filters.section ?? "all";
  const difficulty = filters.difficulty ?? "all";
  const topic = normalizeTopic(filters.topic ?? "");

  return questions.filter((question) => {
    const matchesSection = section === "all" || question.section === section;
    const matchesDifficulty =
      difficulty === "all" || question.difficulty === difficulty;
    const matchesTopic = !topic || normalizeTopic(question.topic) === topic;

    return matchesSection && matchesDifficulty && matchesTopic;
  });
}

export function getTopicSummaries(questions: Question[]): TopicSummary[] {
  const byTopic = new Map<string, TopicSummary>();

  questions.forEach((question) => {
    const current = byTopic.get(question.topic);

    if (current) {
      current.questions += 1;
      return;
    }

    byTopic.set(question.topic, {
      description: topicDescriptions[question.topic] ?? "SAT-style practice",
      mastery: masteryByTopic[question.topic] ?? 55,
      questions: 1,
      section: question.section,
      title: question.topic
    });
  });

  return Array.from(byTopic.values());
}

export function getSectionCount(questions: Question[], section: SectionFilter) {
  if (section === "all") {
    return questions.length;
  }

  return questions.filter((question) => question.section === section).length;
}

export function getUniqueTopicCount(questions: Question[], section?: SectionFilter) {
  const filtered =
    section && section !== "all"
      ? questions.filter((question) => question.section === section)
      : questions;

  return new Set(filtered.map((question) => question.topic)).size;
}

export function getWeakTopics(
  questions: Question[],
  answers: Record<string, string>
) {
  const misses = new Map<string, number>();

  questions.forEach((question) => {
    if (answers[question.id] !== question.correctAnswer) {
      misses.set(question.topic, (misses.get(question.topic) ?? 0) + 1);
    }
  });

  return Array.from(misses.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic)
    .slice(0, 4);
}

export function normalizeTopic(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatSection(section?: SectionFilter) {
  if (!section || section === "all") {
    return "All Sections";
  }

  return section === "math" ? "Math" : "Reading & Writing";
}
