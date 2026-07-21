import type { Question } from "@/types/sat";

export type QuestionBankSubtopic = {
  aliases: string[];
  title: string;
};

export type QuestionBankCategory = {
  description: string;
  section: Question["section"];
  subtopics: QuestionBankSubtopic[];
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
    subtopics: [
      subtopic("Words in Context", ["Vocabulary in Context"]),
      subtopic("Text Structure and Purpose", ["Text Structure"]),
      subtopic("Cross-Text Connections")
    ],
    title: "Craft and Structure"
  },
  {
    description: "Central ideas, evidence, inference, and close reading",
    section: "reading-writing",
    subtopics: [
      subtopic("Central Ideas and Details", ["Reading Comprehension"]),
      subtopic("Inferences", ["Inference"]),
      subtopic("Command of Evidence")
    ],
    title: "Information and Ideas"
  },
  {
    description: "Rhetorical synthesis, transitions, and effective expression",
    section: "reading-writing",
    subtopics: [
      subtopic("Rhetorical Synthesis"),
      subtopic("Transitions")
    ],
    title: "Expression of Ideas"
  },
  {
    description: "Sentence boundaries, agreement, form, and conventions",
    section: "reading-writing",
    subtopics: [
      subtopic("Boundaries", ["Grammar & Conventions", "Grammar and Conventions"]),
      subtopic("Form, Structure, and Sense")
    ],
    title: "Standard English Conventions"
  },
  {
    description: "Linear equations, functions, systems, and inequalities",
    section: "math",
    subtopics: [
      subtopic("Linear Equations in One Variable", ["Algebra"]),
      subtopic("Linear Functions"),
      subtopic("Linear Equations in Two Variables"),
      subtopic("Systems of Two Linear Equations in Two Variables"),
      subtopic("Linear Inequalities in One or Two Variables", ["Linear Inequalities"])
    ],
    title: "Algebra"
  },
  {
    description: "Equivalent expressions, nonlinear equations, and functions",
    section: "math",
    subtopics: [
      subtopic("Equivalent Expressions", ["Advanced Math"]),
      subtopic("Nonlinear Equations in One Variable"),
      subtopic("Systems of Equations in Two Variables"),
      subtopic("Nonlinear Functions")
    ],
    title: "Advanced Math"
  },
  {
    description: "Ratios, percentages, statistics, probability, and data",
    section: "math",
    subtopics: [
      subtopic("Ratios, Rates, Proportional Relationships, and Units", [
        "Problem Solving & Data Analysis",
        "Problem-Solving and Data Analysis",
        "Ratios",
        "Rates"
      ]),
      subtopic("Percentages"),
      subtopic("One-Variable Data: Distributions and Measures of Center and Spread", [
        "One-Variable Data",
        "Statistics"
      ]),
      subtopic("Two-Variable Data: Models and Scatterplots", [
        "Two-Variable Data",
        "Scatterplots"
      ]),
      subtopic("Probability and Conditional Probability", ["Probability"]),
      subtopic("Inference from Sample Statistics and Margin of Error", [
        "Inference from Sample Statistics",
        "Margin of Error"
      ]),
      subtopic("Evaluating Statistical Claims: Observational Studies and Experiments", [
        "Statistical Claims",
        "Observational Studies",
        "Experiments"
      ])
    ],
    title: "Problem-Solving and Data Analysis"
  },
  {
    description: "Area, volume, lines, triangles, trigonometry, and circles",
    section: "math",
    subtopics: [
      subtopic("Area and Volume", ["Geometry & Trigonometry", "Geometry and Trigonometry"]),
      subtopic("Lines, Angles, and Triangles", ["Triangles", "Angles"]),
      subtopic("Right Triangles and Trigonometry", ["Trigonometry", "Right Triangles"]),
      subtopic("Circles")
    ],
    title: "Geometry and Trigonometry"
  }
];

export function getQuestionCategory(question: Question) {
  return getCategoryForTopic(question.section, question.topic).title;
}

export function getQuestionSubtopic(question: Question) {
  return getSubtopicForTopic(question.section, question.topic).title;
}

export function getCategoriesForSection(section: Question["section"]) {
  return QUESTION_BANK_CATEGORIES.filter((category) => category.section === section);
}

export function getCategoryForTopic(
  section: Question["section"],
  topic: string
): QuestionBankCategory {
  const subtopicMatch = getSubtopicMatch(section, topic);

  if (subtopicMatch) {
    return subtopicMatch.category;
  }

  const normalizedTopic = normalize(topic);

  if (section === "math") {
    if (normalizedTopic.includes("advanced") || normalizedTopic.includes("nonlinear")) {
      return getRequiredCategory("Advanced Math");
    }

    if (
      normalizedTopic.includes("problem") ||
      normalizedTopic.includes("data") ||
      normalizedTopic.includes("statistics") ||
      normalizedTopic.includes("ratio") ||
      normalizedTopic.includes("rate") ||
      normalizedTopic.includes("percentage") ||
      normalizedTopic.includes("probability")
    ) {
      return getRequiredCategory("Problem-Solving and Data Analysis");
    }

    if (
      normalizedTopic.includes("geometry") ||
      normalizedTopic.includes("trigonometry") ||
      normalizedTopic.includes("triangle") ||
      normalizedTopic.includes("circle") ||
      normalizedTopic.includes("angle") ||
      normalizedTopic.includes("volume")
    ) {
      return getRequiredCategory("Geometry and Trigonometry");
    }

    return getRequiredCategory("Algebra");
  }

  if (
    normalizedTopic.includes("grammar") ||
    normalizedTopic.includes("convention") ||
    normalizedTopic.includes("boundary") ||
    normalizedTopic.includes("form") ||
    normalizedTopic.includes("structure and sense")
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

export function getSubtopicForTopic(
  section: Question["section"],
  topic: string
): QuestionBankSubtopic {
  const match = getSubtopicMatch(section, topic);

  if (match) {
    return match.subtopic;
  }

  return getCategoryForTopic(section, topic).subtopics[0];
}

export function questionMatchesSubtopic(question: Question, subtopicTitle: string) {
  return getQuestionSubtopic(question) === subtopicTitle;
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

function getSubtopicMatch(section: Question["section"], topic: string) {
  const normalizedTopic = normalize(topic);
  const categories = getCategoriesForSection(section);

  for (const category of categories) {
    for (const currentSubtopic of category.subtopics) {
      const labels = [currentSubtopic.title, ...currentSubtopic.aliases];
      const hasMatch = labels.some((label) => normalize(label) === normalizedTopic);

      if (hasMatch) {
        return { category, subtopic: currentSubtopic };
      }
    }
  }

  return null;
}

function getRequiredCategory(title: string) {
  const category = QUESTION_BANK_CATEGORIES.find((item) => item.title === title);

  if (!category) {
    throw new Error(`Missing question bank category: ${title}`);
  }

  return category;
}

function subtopic(title: string, aliases: string[] = []): QuestionBankSubtopic {
  return { aliases, title };
}

function normalize(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();
}
