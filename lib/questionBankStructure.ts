import type { Question } from "@/types/sat";

export type QuestionBankCategory = {
  description: string;
  section: Question["section"];
  title: string;
};

export type QuestionProgressLookup = {
  answeredIds: Set<string>;
  correctIds: Set<string>;
  incorrectIds: Set<string>;
};

export type QuestionGroupStats = {
  answeredQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  remainingQuestions: number;
  totalQuestions: number;
};

export const QUESTION_BANK_CATEGORIES: QuestionBankCategory[] = [
  {
    description: "Words in context, text structure, purpose, and paired texts",
    section: "reading-writing",
    title: "Craft and Structure"
  },
  {
    description: "Central ideas, evidence, inference, and comprehension",
    section: "reading-writing",
    title: "Information and Ideas"
  },
  {
    description: "Grammar, punctuation, agreement, and sentence boundaries",
    section: "reading-writing",
    title: "Standard English Conventions"
  },
  {
    description: "Transitions, rhetorical synthesis, and effective expression",
    section: "reading-writing",
    title: "Expression of Ideas"
  },
  {
    description: "Linear equations, systems, functions, and inequalities",
    section: "math",
    title: "Algebra"
  },
  {
    description: "Nonlinear functions, equivalent expressions, and quadratics",
    section: "math",
    title: "Advanced Math"
  },
  {
    description: "Ratios, percentages, statistics, probability, and data",
    section: "math",
    title: "Problem-Solving and Data Analysis"
  },
  {
    description: "Area, volume, triangles, circles, and trigonometry",
    section: "math",
    title: "Geometry and Trigonometry"
  }
];

export function getQuestionCategory(question: Question) {
  return getCategoryForTopic(question.section, question.topic).title;
}

export function getCategoriesForSection(section: Question["section"]) {
  return QUESTION_BANK_CATEGORIES.filter((category) => category.section === section);
}

export function getCategoryForTopic(
  section: Question["section"],
  topic: string
): QuestionBankCategory {
  const normalizedTopic = normalize(topic);

  if (section === "math") {
    if (normalizedTopic.includes("advanced")) {
      return getRequiredCategory("Advanced Math");
    }

    if (
      normalizedTopic.includes("problem") ||
      normalizedTopic.includes("data") ||
      normalizedTopic.includes("statistics") ||
      normalizedTopic.includes("ratio")
    ) {
      return getRequiredCategory("Problem-Solving and Data Analysis");
    }

    if (
      normalizedTopic.includes("geometry") ||
      normalizedTopic.includes("trigonometry") ||
      normalizedTopic.includes("triangle") ||
      normalizedTopic.includes("circle")
    ) {
      return getRequiredCategory("Geometry and Trigonometry");
    }

    return getRequiredCategory("Algebra");
  }

  if (
    normalizedTopic.includes("grammar") ||
    normalizedTopic.includes("convention") ||
    normalizedTopic.includes("punctuation") ||
    normalizedTopic.includes("boundary")
  ) {
    return getRequiredCategory("Standard English Conventions");
  }

  if (
    normalizedTopic.includes("transition") ||
    normalizedTopic.includes("expression") ||
    normalizedTopic.includes("synthesis")
  ) {
    return getRequiredCategory("Expression of Ideas");
  }

  if (
    normalizedTopic.includes("reading") ||
    normalizedTopic.includes("comprehension") ||
    normalizedTopic.includes("information") ||
    normalizedTopic.includes("idea") ||
    normalizedTopic.includes("inference") ||
    normalizedTopic.includes("evidence")
  ) {
    return getRequiredCategory("Information and Ideas");
  }

  return getRequiredCategory("Craft and Structure");
}

export function getQuestionGroupStats(
  questions: Question[],
  progress: QuestionProgressLookup
): QuestionGroupStats {
  const totalQuestions = questions.length;
  const answeredQuestions = questions.filter((question) =>
    progress.answeredIds.has(question.id)
  ).length;
  const correctQuestions = questions.filter((question) =>
    progress.correctIds.has(question.id)
  ).length;
  const incorrectQuestions = questions.filter((question) =>
    progress.incorrectIds.has(question.id)
  ).length;

  return {
    answeredQuestions,
    correctQuestions,
    incorrectQuestions,
    remainingQuestions: Math.max(totalQuestions - answeredQuestions, 0),
    totalQuestions
  };
}

export function getMastery(stats: QuestionGroupStats) {
  if (stats.answeredQuestions === 0) {
    return null;
  }

  return Math.round((stats.correctQuestions / stats.answeredQuestions) * 100);
}

function getRequiredCategory(title: string) {
  const category = QUESTION_BANK_CATEGORIES.find((item) => item.title === title);

  if (!category) {
    throw new Error(`Missing question bank category: ${title}`);
  }

  return category;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/&/g, "and");
}
