"use client";

import {
  Bookmark, ChevronDown, ChevronLeft, ListChecks, Loader2, MoreVertical, Pause, Play,
  RotateCcw, Sparkles, Timer as TimerIcon
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AITutorPanel } from "@/components/ai-tutor/AITutorPanel";
import { confirmLeavingStudy, StudentShell } from "@/components/dashboard/StudentShell";
import { QuestionNavigator } from "@/components/question-bank/practice/QuestionNavigator";
import { Highlightable } from "@/components/quiz/Highlightable";
import { MathText } from "@/components/quiz/MathText";
import { QuestionAnswers, QuestionExplanation, QuestionStem } from "@/components/quiz/QuestionCard";
import { QuestionHighlightControls, useQuestionHighlight } from "@/components/quiz/QuestionHighlight";
import { formatTime } from "@/components/quiz/Timer";
import { getMarkedQuestionIds, setQuestionMarked } from "@/lib/supabase/queries";
import { splitReadingQuestion } from "@/lib/readingQuestionLayout";
import type { Question, QuestionFeedback, QuestionSummary } from "@/types/sat";

const control = "inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-default disabled:opacity-40";
const summary = "list-none [&::-webkit-details-marker]:hidden";
const panel = "absolute z-30 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 shadow-lg";

type PracticeExamProps = {
  backHref: string;
  children?: ReactNode;
  currentIndex: number;
  elapsedSeconds: number;
  feedbackByQuestion: Record<string, QuestionFeedback>;
  isChecking: boolean;
  isTimerPaused: boolean;
  isSavingResult: boolean;
  onNext: () => void;
  onTimerPauseChange: (paused: boolean) => void;
  onPrevious: () => void;
  onRestart: () => void;
  onSelect: (answer: string) => void;
  onShowQuestion: (index: number) => void;
  persistenceMessage: string | null;
  question?: Question;
  questionSeconds: number;
  questions: QuestionSummary[];
  selectedAnswer: string | null;
  userId?: string;
};

export function PracticeExam({
  backHref, children, currentIndex, elapsedSeconds, feedbackByQuestion, isChecking, isTimerPaused, isSavingResult,
  onNext, onTimerPauseChange, onPrevious, onRestart, onSelect, onShowQuestion, persistenceMessage,
  question, questionSeconds, questions, selectedAnswer, userId
}: PracticeExamProps) {
  const [timerVisible, setTimerVisible] = useState(true);
  const [showSessionTime, setShowSessionTime] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [choiceDrafts, setChoiceDrafts] = useState<Record<string, string | null>>({});
  const [markedIds, setMarkedIds] = useState<Set<string>>(() => new Set());
  const [marksStatus, setMarksStatus] = useState<"loading" | "ready" | "saving">("loading");
  const [marksError, setMarksError] = useState<string | null>(null);
  const marked = useMemo(() => questions.flatMap((item, index) => markedIds.has(item.id) ? [index] : []), [questions, markedIds]);
  const [openExplanationId, setOpenExplanationId] = useState<string | null>(null);
  const highlight = useQuestionHighlight();
  const passagePanel = useRef<HTMLElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const questionPanel = useRef<HTMLDivElement>(null);
  const explanation = useRef<HTMLDivElement>(null);
  const feedback = question ? feedbackByQuestion[question.id] : undefined;
  const showExplanation = !!question && question.id === openExplanationId && !!feedback;
  const questionId = question?.id;
  const timer = showSessionTime ? elapsedSeconds : questionSeconds;
  const timerLabel = showSessionTime ? "Session timer" : "Question timer";

  useEffect(() => {
    workspace.current?.scrollTo(0, 0);
    passagePanel.current?.scrollTo(0, 0);
    questionPanel.current?.scrollTo(0, 0);
  }, [currentIndex]);

  useEffect(() => {
    if (showExplanation) explanation.current?.scrollIntoView({ block: "nearest" });
  }, [showExplanation, questionId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void getMarkedQuestionIds(userId).then((ids) => {
      if (active) setMarkedIds(ids);
    }).catch(() => {
      if (active) setMarksError("Saved review marks could not be loaded.");
    }).finally(() => {
      if (active) setMarksStatus("ready");
    });
    return () => { active = false; };
  }, [userId]);

  async function toggleMark() {
    if (!questionId) return;
    const next = !markedIds.has(questionId);
    setMarksError(null);
    setMarksStatus("saving");
    try {
      if (userId) await setQuestionMarked(userId, questionId, next);
      setMarkedIds((current) => {
        const updated = new Set(current);
        if (next) updated.add(questionId);
        else updated.delete(questionId);
        return updated;
      });
    } catch {
      setMarksError("This review mark could not be saved. Try again.");
    } finally {
      setMarksStatus("ready");
    }
  }

  const { passage, prompt } = question?.section === "reading-writing"
    ? splitReadingQuestion(question.question)
    : { passage: question?.question ?? "", prompt: "" };
  const hasPassage = Boolean(passage || question?.imageUrls.length);
  const isMarked = marked.includes(currentIndex);

  return (
    <StudentShell active="question-bank" exam guardExit={Boolean(question)}>
    <main aria-label="Practice Mode" className="flex h-full min-h-0 flex-col bg-white text-slate-950">
      <header className="relative z-20 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-1 border-b border-slate-200 px-2 py-1.5 sm:gap-4 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-0.5 text-sm font-medium text-slate-700 sm:gap-x-7">
          <Link className="inline-flex items-center gap-1 whitespace-nowrap hover:text-slate-950" href={backHref} onNavigate={(event) => { if (question && !confirmLeavingStudy()) event.preventDefault(); }}>
            <ChevronLeft size={16} aria-hidden="true" />
            Go back
          </Link>
          {question ? (
            <details className="group">
              <summary className={`${summary} inline-flex cursor-pointer items-center gap-1 whitespace-nowrap hover:text-slate-950`}>
                Directions <ChevronDown className="group-open:rotate-180" size={14} aria-hidden="true" />
              </summary>
              <div className={`${panel} left-2 top-full mt-1 max-w-[min(24rem,calc(100vw-1rem))] sm:left-28`}>
                <p className="font-semibold">{question.section === "math" ? "Math" : "Reading & Writing"} directions</p>
                <p className="mt-2 leading-6">{question.choices.length
                  ? "Read each question carefully, select the best answer, then choose Check. You can cross out choices and mark questions for review."
                  : "Read the question, enter your answer, then choose Check. You can enter a whole number, decimal, or fraction."}</p>
              </div>
            </details>
          ) : null}
        </div>

        {question ? (
          <>
            <div className="min-w-20 text-center">
              <p aria-label={timerVisible ? `${timerLabel} ${formatTime(timer)}` : undefined} className="h-6 text-base font-semibold tabular-nums leading-6 sm:text-lg">
                {timerVisible ? formatTime(timer).padStart(5, "0") : ""}
              </p>
              <div className="flex items-center justify-center gap-1.5">
                <button
                  aria-label={isTimerPaused ? "Resume timer" : "Pause timer"}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  disabled={isChecking || isSavingResult}
                  onClick={() => onTimerPauseChange(!isTimerPaused)}
                  type="button"
                >
                  {isTimerPaused ? <Play size={12} /> : <Pause size={12} />}
                </button>
                <button className="h-6 rounded-full border border-slate-200 px-2 text-xs text-slate-700 hover:bg-slate-100" onClick={() => setTimerVisible(!timerVisible)} type="button">
                  {timerVisible ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-1 sm:gap-2">
              <button
                aria-label={`Showing ${timerLabel.toLowerCase()}. Switch timer`}
                className={`${control} px-2`}
                onClick={() => setShowSessionTime(!showSessionTime)}
                title={showSessionTime ? "Show question timer" : "Show session timer"}
                type="button"
              >
                <TimerIcon size={16} aria-hidden="true" />
              </button>
              <QuestionHighlightControls compact {...highlight} />
              <details className="relative">
                <summary aria-label="More options" className={`${control} ${summary} px-2`}>
                  <MoreVertical size={16} aria-hidden="true" />
                </summary>
                <div className={`${panel} right-0 top-full mt-1`}>
                  <button className={control} disabled={isChecking || isSavingResult} onClick={onRestart} type="button">
                    <RotateCcw size={15} aria-hidden="true" /> Restart practice
                  </button>
                </div>
              </details>
            </div>
          </>
        ) : null}
      </header>

      {children ?? (question ? (
        <>
          <div className="relative flex min-h-0 flex-1 flex-col">
            {persistenceMessage ? (
              <p className="shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-center text-xs text-slate-600" role="status">
                {persistenceMessage}
              </p>
            ) : null}
            <div
              className={`grid min-h-0 flex-1 content-start overflow-y-auto ${hasPassage ? "lg:grid-cols-2 lg:content-stretch lg:overflow-hidden" : ""}`}
              ref={workspace}
            >
              {hasPassage ? (
                <section aria-label={question.section === "math" ? "Problem" : "Reading passage"} className="min-w-0 lg:overflow-y-auto lg:border-r lg:border-slate-200" ref={passagePanel}>
                  <div className="mx-auto max-w-[40rem] lg:mr-0 px-4 pb-2 pt-6 sm:px-5 lg:pb-8 lg:pt-8">
                    <QuestionStem
                      className="break-words font-serif text-[18px] leading-[1.5]"
                      highlight={highlight}
                      key={question.id}
                      number={currentIndex + 1}
                      question={question}
                      text={passage}
                    />
                  </div>
                </section>
              ) : null}
              <section
                aria-label="Question and answers"
                className={`min-w-0 ${hasPassage ? "lg:overflow-y-auto" : ""}`}
                ref={questionPanel}
              >
                <div className={`max-w-[40rem] px-4 pb-8 pt-4 sm:px-5 mx-auto ${hasPassage ? "lg:ml-0" : ""}`}>
                  <div className="flex min-h-10 items-center rounded-lg bg-slate-100">
                    <span aria-label={`Question ${currentIndex + 1}`} className="flex min-h-10 min-w-10 items-center justify-center rounded-lg bg-neutral-900 px-2 text-lg font-semibold text-white">
                      {currentIndex + 1}
                    </span>
                    <button
                      aria-pressed={isMarked}
                      className="inline-flex min-h-10 items-center gap-2 px-3 text-sm font-medium hover:underline"
                      disabled={Boolean(userId) && marksStatus !== "ready"}
                      onClick={toggleMark}
                      type="button"
                    >
                      <Bookmark aria-hidden="true" className={isMarked ? "fill-amber-400 text-amber-700" : "text-slate-500"} size={16} />
                      Mark for Review
                    </button>
                  </div>
                  {marksError ? <p className="mt-2 text-sm text-amber-700" role="status">{marksError}</p> : null}
                  {prompt ? (
                    <Highlightable
                      className="mt-3 break-words font-serif text-[18px] leading-[1.5]"
                      enabled={highlight.highlightEnabled}
                      key={`prompt-${question.id}`}
                      storageKey={`question-prompt-${question.id}`}
                      tool={highlight.highlightTool}
                    >
                      <MathText images={question.imageUrls} text={prompt} />
                    </Highlightable>
                  ) : null}
                  <QuestionAnswers
                    choiceDraft={{
                      value: choiceDrafts[question.id] ?? null,
                      onChange: (value) => setChoiceDrafts((drafts) => ({ ...drafts, [question.id]: value }))
                    }}
                    examStyle
                    feedback={feedback}
                    key={question.id}
                    mode="practice"
                    onSelect={onSelect}
                    question={question}
                    selectedAnswer={selectedAnswer}
                    showFeedback={Boolean(feedback)}
                  />
                  {feedback ? (
                    <div ref={explanation}>
                      <QuestionExplanation feedback={feedback} highlight={highlight} key={question.id} questionId={question.id} showExplanation={showExplanation} />
                      <p className="mt-2 text-sm text-slate-600">
                        {feedback.isCorrect
                          ? `Correct answer time: ${formatTime(questionSeconds)}${feedback.timingRecorded ? " · saved to your timing statistics." : "."}`
                          : "Incorrect answers are excluded from timing statistics."}
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </div>

          <footer className="relative z-10 shrink-0 border-t border-slate-200 bg-white px-3 py-2.5 sm:px-5">
            <div className="mx-auto flex max-w-[72rem] flex-wrap items-center justify-between gap-2">
              <QuestionNavigator
                currentIndex={currentIndex}
                disabled={isChecking || isSavingResult}
                feedback={feedbackByQuestion}
                marked={marked}
                onShowQuestion={onShowQuestion}
                questions={questions}
              />
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-violet-600 px-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
                  onClick={() => setTutorOpen(true)}
                  type="button"
                >
                  <Sparkles size={15} aria-hidden="true" /> Ask AI Tutor
                </button>
                <button aria-expanded={showExplanation} className={control} disabled={!feedback} onClick={() => setOpenExplanationId(showExplanation ? null : question.id)} type="button">
                  <ListChecks size={15} aria-hidden="true" /> Explanation
                </button>
                <button className={control} disabled={currentIndex === 0 || isChecking || isSavingResult} onClick={onPrevious} type="button">
                  Previous
                </button>
                <button className={control} disabled={!feedback || isChecking || isSavingResult} onClick={onNext} type="button">
                  {isSavingResult ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : null}
                  {currentIndex === questions.length - 1 ? "Show Results" : "Next"}
                </button>
              </div>
            </div>
          </footer>
          {tutorOpen ? (
            <AITutorPanel isOpen key={question.id} onClose={() => setTutorOpen(false)} overlay question={question} selectedAnswer={selectedAnswer} />
          ) : null}
        </>
      ) : null)}
    </main>
    </StudentShell>
  );
}
