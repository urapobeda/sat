import type { Question, ReviewQuestion } from "@/types/sat";

export type HomeworkReviewStatus = "correct" | "incorrect" | "unanswered" | "hidden" | "unavailable";
export type HomeworkReviewItem = {
  question: Question; number: number; answer: string | null;
  review: ReviewQuestion | null; status: HomeworkReviewStatus;
};
export function homeworkReviewItems(questions: Question[], reviews: ReviewQuestion[] | null, answers: Record<string, string>, showAnswers: boolean): HomeworkReviewItem[] {
  // Hidden results never enter the presentation model, including labels and aria text.
  const byId = new Map((showAnswers ? reviews ?? [] : []).map(review => [review.id, review]));
  return questions.map((question, index) => {
    const answer = answers[question.id]?.trim() || null;
    const review = byId.get(question.id) ?? null;
    const status: HomeworkReviewStatus = !showAnswers ? "hidden" : !review ? "unavailable" : !answer ? "unanswered"
      : review.isCorrect === true ? "correct" : review.isCorrect === false ? "incorrect" : "unavailable";
    // isCorrect is authoritative: 0.5 and 1/2 must not be compared as strings.
    return { question, number: index + 1, answer, review, status };
  });
}
export function isHomeworkMistake(item: HomeworkReviewItem) { return item.status === "incorrect" || item.status === "unanswered"; }
export function visibleHomeworkReview(items: HomeworkReviewItem[], onlyMistakes: boolean, currentId: string | null) {
  const visible = onlyMistakes ? items.filter(isHomeworkMistake) : items;
  const index = Math.max(0, visible.findIndex(item => item.question.id === currentId));
  return { items: visible, index, current: visible[index] ?? null };
}
export const HOMEWORK_REVIEW_STATUS: Record<HomeworkReviewStatus, string> = {
  correct: "Correct", incorrect: "Incorrect", unanswered: "Not answered", hidden: "Results hidden", unavailable: "Result unavailable"
};
