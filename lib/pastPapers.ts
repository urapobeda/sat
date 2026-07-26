import type { ExamAttempt, ExamModule, ExamPaper } from "@/types/database";

export type PaperStatusFilter = "all" | "not-started" | "in-progress" | "completed";
export type PaperSort = "newest" | "oldest" | "recommended" | "difficulty" | "best-score";

export type PaperWithStats = ExamPaper & {
  attempts: ExamAttempt[];
  bestScore: number | null;
  isBookmarked: boolean;
  latestAttemptDate: string | null;
  moduleCount: number;
  modules: ExamModule[];
  progressPercentage: number;
  questionCount: number;
  status: PaperStatusFilter;
};

const difficultyRank: Record<ExamPaper["difficulty"], number> = {
  foundation: 1,
  standard: 2,
  advanced: 3
};

export function buildPaperWithStats({
  attempts,
  isBookmarked,
  modules,
  paper
}: {
  attempts: ExamAttempt[];
  isBookmarked: boolean;
  modules: ExamModule[];
  paper: ExamPaper;
}): PaperWithStats {
  const completedAttempts = attempts.filter((attempt) => attempt.status === "completed");
  const inProgressAttempt = attempts.find((attempt) => attempt.status === "in-progress");
  const latestAttempt = [...attempts].sort(
    (first, second) =>
      new Date(second.completed_at ?? second.started_at).getTime() -
      new Date(first.completed_at ?? first.started_at).getTime()
  )[0];
  const questionCount =
    modules.reduce((sum, module) => sum + module.question_count, 0) || 0;
  const progressPercentage = inProgressAttempt
    ? getAttemptProgress(inProgressAttempt, questionCount)
    : completedAttempts.length > 0
      ? 100
      : 0;

  return {
    ...paper,
    attempts,
    bestScore: getBestScore(attempts),
    isBookmarked,
    latestAttemptDate: latestAttempt?.completed_at ?? latestAttempt?.started_at ?? null,
    moduleCount: modules.length,
    modules: modules.sort((first, second) => first.sort_order - second.sort_order),
    progressPercentage,
    questionCount,
    status: inProgressAttempt
      ? "in-progress"
      : completedAttempts.length > 0
        ? "completed"
        : "not-started"
  };
}

export function filterPapers(
  papers: PaperWithStats[],
  filters: {
    difficulty?: string;
    mode?: string;
    paperType?: string;
    search?: string;
    source?: string;
    status?: string;
    year?: string;
  }
) {
  const query = filters.search?.trim().toLowerCase() ?? "";

  return papers.filter((paper) => {
    const matchesSearch =
      query.length === 0 ||
      paper.title.toLowerCase().includes(query) ||
      (paper.description ?? "").toLowerCase().includes(query);
    const matchesPaperType =
      !filters.paperType || filters.paperType === "all" || paper.paper_type === filters.paperType;
    const matchesMode = !filters.mode || filters.mode === "all" || paper.mode === filters.mode;
    const matchesDifficulty =
      !filters.difficulty || filters.difficulty === "all" || paper.difficulty === filters.difficulty;
    const matchesStatus =
      !filters.status || filters.status === "all" || paper.status === filters.status;
    const matchesSource =
      !filters.source || filters.source === "all" || paper.source_type === filters.source;
    const matchesYear =
      !filters.year || filters.year === "all" || String(paper.year ?? "") === filters.year;

    return (
      matchesSearch &&
      matchesPaperType &&
      matchesMode &&
      matchesDifficulty &&
      matchesStatus &&
      matchesSource &&
      matchesYear
    );
  });
}

export function sortPapers(papers: PaperWithStats[], sort: PaperSort) {
  return [...papers].sort((first, second) => {
    if (sort === "oldest") {
      return new Date(first.created_at).getTime() - new Date(second.created_at).getTime();
    }

    if (sort === "difficulty") {
      return difficultyRank[first.difficulty] - difficultyRank[second.difficulty];
    }

    if (sort === "best-score") {
      return (second.bestScore ?? 0) - (first.bestScore ?? 0);
    }

    if (sort === "recommended") {
      return Number(second.is_featured) - Number(first.is_featured);
    }

    return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
  });
}

export function formatPaperType(value: ExamPaper["paper_type"]) {
  const labels: Record<ExamPaper["paper_type"], string> = {
    "full-length": "Full-Length",
    "math": "Math",
    "mini-test": "Mini Test",
    "reading-writing": "Reading & Writing"
  };

  return labels[value];
}

export function formatPaperMode(value: ExamPaper["mode"]) {
  const labels: Record<ExamPaper["mode"], string> = {
    adaptive: "Adaptive",
    linear: "Linear",
    "untimed-practice": "Untimed Practice"
  };

  return labels[value];
}

export function formatPaperDifficulty(value: ExamPaper["difficulty"]) {
  return value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function formatSourceType(value: ExamPaper["source_type"]) {
  const labels: Record<ExamPaper["source_type"], string> = {
    licensed: "Licensed",
    original: "Original",
    "public-permission": "Publicly Permitted"
  };

  return labels[value];
}

function getBestScore(attempts: ExamAttempt[]) {
  const scores = attempts
    .map((attempt) => attempt.estimated_score)
    .filter((score): score is number => typeof score === "number");

  return scores.length > 0 ? Math.max(...scores) : null;
}

function getAttemptProgress(attempt: ExamAttempt, questionCount: number) {
  if (questionCount === 0) {
    return 0;
  }

  return Math.min(Math.round((attempt.current_question_index / questionCount) * 100), 99);
}
