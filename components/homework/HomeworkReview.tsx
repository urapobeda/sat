"use client";
import { useRef, useState } from "react";
import { AssignmentFeedbackList } from "@/components/homework/AssignmentFeedbackList";
import { HardQuestionButton } from "@/components/hard-questions/HardQuestionButton";
import { MathText } from "@/components/quiz/MathText";
import { QuestionStem } from "@/components/quiz/QuestionCard";
import { QuestionHighlightControls, useQuestionHighlight } from "@/components/quiz/QuestionHighlight";
import { HOMEWORK_REVIEW_STATUS, homeworkReviewItems, isHomeworkMistake, visibleHomeworkReview, type HomeworkReviewItem } from "@/lib/homeworkReview";
import { duration } from "@/lib/assignmentReport";
import type { AssignmentFeedback } from "@/lib/assignmentReport";
import type { Question, ReviewQuestion } from "@/types/sat";

type Props = {
  questions: Question[]; reviews: ReviewQuestion[] | null; answers: Record<string, string>;
  feedback: AssignmentFeedback[]; answerTimes: Record<string, number | null>;
  showAnswers: boolean; canRetake: boolean; onRetake: () => void;
};
const navButton = "min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium disabled:cursor-default disabled:opacity-40";
const statusClasses = {
  correct: "border-emerald-300 bg-emerald-50 text-emerald-800", incorrect: "border-rose-300 bg-rose-50 text-rose-800",
  unanswered: "border-rose-300 bg-rose-50 text-rose-800", hidden: "border-slate-200 bg-white text-slate-700", unavailable: "border-slate-200 bg-white text-slate-700"
};
export function HomeworkReview({ questions, reviews, answers, feedback, answerTimes, showAnswers, canRetake, onRetake }: Props) {
  const [onlyMistakes, setOnlyMistakes] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(questions[0]?.id ?? null);
  const questionPanel = useRef<HTMLElement>(null);
  const highlight = useQuestionHighlight();
  const items = homeworkReviewItems(questions, reviews, answers, showAnswers);
  const filtered = visibleHomeworkReview(items, showAnswers && onlyMistakes, currentId);
  const current = filtered.current;
  const questionIds = questions.map(question => question.id);
  const overallFeedback = feedback.filter(item => item.question_id === null || !questionIds.includes(item.question_id));
  const currentFeedback = current ? feedback.filter(item => item.question_id === current.question.id) : [];
  function go(id: string, scroll = false) {
    setCurrentId(id);
    if (scroll) questionPanel.current?.scrollIntoView({ block: "start" });
  }
  return <section className="min-w-0 space-y-5" aria-label="Homework answer review">
    {overallFeedback.length ? <AssignmentFeedbackList feedback={overallFeedback} questionIds={questionIds} /> : null}
    <div className="hub-card space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Answer review</h2>{canRetake ? <button className="hub-primary min-h-11 cursor-pointer" type="button" onClick={onRetake}>Retake</button> : null}</div>
      {showAnswers ? <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input className="size-5 cursor-pointer accent-blue-600" type="checkbox" checked={onlyMistakes} onChange={event => setOnlyMistakes(event.target.checked)} />Only mistakes</label> : <p className="text-sm text-slate-500">You can review your submitted answers and teacher comments. Correct answers and explanations are hidden.</p>}
      <nav aria-label="Review question navigation" className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2">
        {filtered.items.map(item => <button
          key={item.question.id} type="button" aria-current={current?.question.id === item.question.id ? "step" : undefined}
          aria-label={`Question ${item.number}, ${HOMEWORK_REVIEW_STATUS[item.status].toLowerCase()}`}
          className={`relative flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-1 rounded-xl border text-sm font-medium ${statusClasses[item.status]} ${current?.question.id === item.question.id ? "ring-2 ring-blue-600 ring-offset-2" : ""}`}
          onClick={() => go(item.question.id)}>
          {item.number}<span aria-hidden="true" className="text-xs">{item.status === "correct" ? "✓" : isHomeworkMistake(item) ? "×" : ""}</span>
        </button>)}
      </nav>
      {showAnswers && onlyMistakes ? <p className="text-sm text-slate-500">Showing {filtered.items.length} {filtered.items.length === 1 ? "mistake" : "mistakes"}. Question numbers match the original assignment.</p> : null}
    </div>
    {!current ? <div className="hub-card space-y-3 p-5"><p>{onlyMistakes ? items.some(item => item.status === "unavailable") ? "No reviewed mistakes found. Some question results are unavailable." : "No mistakes to review." : "No questions are available for this submission."}</p>{onlyMistakes ? <button className={navButton} type="button" onClick={() => setOnlyMistakes(false)}>Show all questions</button> : null}</div> : <>
      <article ref={questionPanel} className="hub-card min-w-0 scroll-mt-4 space-y-5 p-4 sm:p-6" aria-label={`Review question ${current.number}`}>
        <header className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Question {current.number} of {questions.length}</h3>{answerTimes[current.question.id] !== null && answerTimes[current.question.id] !== undefined ? <p className="mt-1 text-xs text-slate-500">Time on question: {duration(answerTimes[current.question.id])}</p> : null}</div><QuestionHighlightControls {...highlight} /></header>
        <HardQuestionButton questionId={current.question.id} />
        <QuestionStem question={current.question} number={current.number} highlight={highlight} className="break-words text-[17px] leading-8" />
        <div className={`grid min-w-0 items-start gap-5 ${currentFeedback.length ? "lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)]" : ""}`}>
          <HomeworkAnswerDetails item={current} />
          {currentFeedback.length ? <aside className="min-w-0" aria-label={`Teacher comments for question ${current.number}`}><AssignmentFeedbackList feedback={currentFeedback} questionIds={questionIds} /></aside> : null}
        </div>
        {current.review ? <section className="space-y-3 border-t border-slate-200 pt-5" aria-label="Explanation"><h4 className="font-semibold">Explanation</h4>{current.review.explanation.trim() ? <MathText text={current.review.explanation} images={current.question.imageUrls} className="break-words text-[15px] leading-7 text-slate-700" /> : <p className="text-sm text-slate-500">No explanation is available for this question yet.</p>}</section> : showAnswers ? <p className="text-sm text-slate-500">The answer review is unavailable for this question.</p> : null}
      </article>
      <div className="grid grid-cols-2 gap-3" aria-label="Review navigation controls"><button className={navButton} type="button" disabled={filtered.index === 0} onClick={() => go(filtered.items[filtered.index - 1].question.id, true)}>← Previous</button><button className={navButton} type="button" disabled={filtered.index === filtered.items.length - 1} onClick={() => go(filtered.items[filtered.index + 1].question.id, true)}>Next →</button></div>
    </>}
  </section>;
}

export function HomeworkAnswerDetails({ item }: { item: HomeworkReviewItem }) {
  const { question, answer, review, status } = item;
  const correctLabel = review?.correctLabel ?? (question.choices.some(choice => choice.label === review?.correctAnswer) ? review?.correctAnswer : null);
  const listedAnswer = question.choices.some(choice => choice.label === answer);
  return <div className="min-w-0 space-y-4">
    {question.choices.length ? <ol className="space-y-3" aria-label="Answer choices">{question.choices.map(choice => {
      const selected = choice.label === answer, correct = choice.label === correctLabel;
      return <li key={choice.label} className={`min-w-0 rounded-xl border p-3 sm:p-4 ${correct ? "border-emerald-400 bg-emerald-50" : selected ? status === "incorrect" ? "border-rose-300 bg-rose-50" : "border-blue-400 bg-blue-50" : "border-slate-200"}`}>
        <div className="flex flex-wrap items-center gap-2"><span className="mr-1 grid size-8 shrink-0 place-items-center rounded-full border border-current text-sm font-semibold">{choice.label}</span>{selected ? <span className="rounded-full border border-current px-2 py-1 text-xs font-medium">Your answer</span> : null}{correct ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">Correct answer</span> : null}</div>
        {choice.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- imported graph choices retain their natural dimensions
          <img alt={`Choice ${choice.label} figure`} className="mt-3 block h-auto max-h-80 w-auto max-w-full" src={choice.imageUrl} />
        ) : null}
        {choice.text ? <MathText className="mt-2 break-words leading-7" text={choice.text} /> : null}
      </li>;
    })}</ol> : null}
    {!listedAnswer ? <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-medium text-slate-500">Your answer</p>{answer ? <MathText text={answer} className="mt-1 break-words font-medium" /> : <p className="mt-1 text-sm text-slate-600">No answer submitted</p>}</div> : null}
    {review && !correctLabel ? <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4"><p className="text-xs font-medium text-emerald-800">Correct answer</p><MathText text={review.correctAnswer} className="mt-1 break-words font-medium" /></div> : null}
    {review && status !== "unavailable" ? <p role="status" className={`rounded-xl border p-4 text-sm ${statusClasses[status]}`}>
      {status === "correct" ? "Correct." : <>{status === "unanswered" ? "No answer submitted." : "Incorrect."} Correct answer: <MathText inline text={review.correctLabel ?? review.correctAnswer} />.</>}
    </p> : null}
  </div>;
}
