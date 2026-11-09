"use client";

import { Flag, Info, Send } from "lucide-react";
import { useState } from "react";
import { AnswerOption } from "@/components/quiz/AnswerOption";
import { Highlightable } from "@/components/quiz/Highlightable";
import { MathText } from "@/components/quiz/MathText";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import { QuestionHighlightControls, useQuestionHighlight } from "@/components/quiz/QuestionHighlight";
import { Timer } from "@/components/quiz/Timer";
import { TopicBadge } from "@/components/quiz/TopicBadge";
import type { Question, QuestionFeedback } from "@/types/sat";

type QuestionCardProps = {
  currentIndex: number;
  mode?: "practice" | "test";
  onSelect: (answer: string) => void;
  question: Question;
  feedback?: QuestionFeedback | null;
  selectedAnswer: string | null;
  showFeedback?: boolean;
  timerSeconds?: number;
  totalQuestions: number;
};

type HighlightSettings = Pick<ReturnType<typeof useQuestionHighlight>, "highlightEnabled" | "highlightTool">;

// Crossed-out choices are remembered per question while the page is open.
const eliminatedByQuestion = new Map<string, string[]>();

export function QuestionCard({
  currentIndex,
  mode = "practice",
  onSelect,
  question,
  feedback,
  selectedAnswer,
  showFeedback = false,
  timerSeconds,
  totalQuestions
}: QuestionCardProps) {
  const progress = ((currentIndex + 1) / Math.max(totalQuestions, 1)) * 100;
  const highlight = useQuestionHighlight();

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-600">
            Question {currentIndex + 1} of {totalQuestions}
          </p>
          <ProgressBar className="mt-3" value={progress} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {timerSeconds !== undefined ? <Timer label="Question" seconds={timerSeconds} /> : null}
          <QuestionHighlightControls {...highlight} />
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            type="button"
          >
            <Flag size={16} />
            Report
          </button>
        </div>
      </div>
      <div className="mt-6">
        <TopicBadge difficulty={question.difficulty} section={question.section} topic={question.topic} />
      </div>
      <QuestionStem className="mt-6 text-[17px] leading-8" highlight={highlight} number={currentIndex + 1} question={question} />
      <QuestionAnswers
        feedback={showFeedback ? feedback : null}
        key={question.id}
        mode={mode}
        onSelect={onSelect}
        question={question}
        selectedAnswer={selectedAnswer}
        showFeedback={showFeedback}
      />
      {showFeedback && selectedAnswer !== null && feedback ? (
        <QuestionExplanation feedback={feedback} highlight={highlight} questionId={question.id} />
      ) : null}
    </article>
  );
}

export function QuestionStem({ className, highlight, number, question, text = question.question }: {
  className?: string;
  highlight: HighlightSettings;
  number: number;
  question: Question;
  text?: string;
}) {
  const placesOwnFigures = /\[\[img:\d+\]\]/.test(text);

  return (
    <Highlightable
      className={`text-slate-950 ${className ?? ""}`}
      enabled={highlight.highlightEnabled}
      storageKey={`question-${question.id}`}
      tool={highlight.highlightTool}
    >
      {!placesOwnFigures && question.imageUrls.length > 0 ? (
        <div className="mb-4 grid gap-4">
          {question.imageUrls.map((imageUrl, imageIndex) => (
            // eslint-disable-next-line @next/next/no-img-element -- figures come from Supabase Storage at their natural size
            <img
              alt={`Question ${number} figure ${imageIndex + 1}`}
              className="mx-auto block h-auto max-h-[420px] w-auto max-w-full"
              key={`${question.id}-image-${imageIndex}`}
              src={imageUrl}
            />
          ))}
        </div>
      ) : null}
      <MathText imageAlt={`Question ${number} figure`} images={question.imageUrls} text={text} />
    </Highlightable>
  );
}

export function QuestionAnswers({
  choiceDraft,
  examStyle = false,
  feedback,
  mode,
  onSelect,
  question,
  selectedAnswer,
  showFeedback = false
}: Pick<QuestionCardProps, "feedback" | "onSelect" | "question" | "selectedAnswer" | "showFeedback"> & {
  choiceDraft?: { value: string | null; onChange: (value: string | null) => void };
  examStyle?: boolean;
  mode: NonNullable<QuestionCardProps["mode"]>;
}) {
  const hasAnswered = selectedAnswer !== null;
  const [eliminated, setEliminated] = useState<string[]>(() => eliminatedByQuestion.get(question.id) ?? []);

  function updateEliminated(next: string[]) {
    eliminatedByQuestion.set(question.id, next);
    setEliminated(next);
  }

  function selectChoice(label: string) {
    if (eliminated.includes(label)) updateEliminated(eliminated.filter((item) => item !== label));
    if (choiceDraft) {
      choiceDraft.onChange(label);
    } else {
      onSelect(label);
    }
  }

  function toggleEliminate(label: string) {
    if (choiceDraft?.value === label) choiceDraft.onChange(null);
    updateEliminated(eliminated.includes(label) ? eliminated.filter((item) => item !== label) : [...eliminated, label]);
  }

  if (question.choices.length === 0) {
    return (
      <FreeResponseInput
        hasAnswered={hasAnswered}
        initialAnswer={selectedAnswer ?? ""}
        key={selectedAnswer ?? "draft"}
        mode={mode}
        onSelect={onSelect}
        questionId={question.id}
      />
    );
  }

  return (
    <div className={examStyle ? "mt-4 grid gap-3" : "mt-7 grid gap-3"}>
      {question.choices.map((choice) => (
        <AnswerOption
          choice={choice}
          correctLabel={feedback?.correctLabel}
          examStyle={examStyle}
          isDisabled={mode === "practice" && hasAnswered}
          isEliminated={eliminated.includes(choice.label)}
          isSelected={(selectedAnswer ?? choiceDraft?.value) === choice.label}
          key={choice.label}
          onCheck={choiceDraft?.value === choice.label && !showFeedback ? onSelect : undefined}
          onSelect={selectChoice}
          onToggleEliminate={toggleEliminate}
          showFeedback={showFeedback}
        />
      ))}
    </div>
  );
}

export function QuestionExplanation({ feedback, highlight, questionId, showExplanation = true }: {
  feedback: QuestionFeedback;
  highlight: HighlightSettings;
  questionId: string;
  showExplanation?: boolean;
}) {
  return (
    <div className={[
      "mt-6 rounded-xl border p-5",
      feedback.isCorrect ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-rose-200 bg-rose-50 text-rose-950"
    ].join(" ")}>
      <p className="text-sm font-semibold">{feedback.isCorrect ? "Correct" : "Incorrect"}</p>
      <p className="mt-2 text-sm leading-6">
        Correct answer: <span className="font-semibold">{feedback.correctAnswer}</span>
      </p>
      {showExplanation ? (
        <Highlightable className="mt-3 text-[15px] leading-7 text-slate-800" enabled={highlight.highlightEnabled} storageKey={`explanation-${questionId}`} tool={highlight.highlightTool}>
          <MathText text={feedback.explanation} />
        </Highlightable>
      ) : null}
    </div>
  );
}

function FreeResponseInput({
  hasAnswered,
  initialAnswer,
  mode,
  onSelect,
  questionId
}: {
  hasAnswered: boolean;
  initialAnswer: string;
  mode: "practice" | "test";
  onSelect: (answer: string) => void;
  questionId: string;
}) {
  const [draftAnswer, setDraftAnswer] = useState(initialAnswer);
  const isLocked = mode === "practice" && hasAnswered;
  const preview = answerPreview(draftAnswer);

  function submitFreeResponse() {
    const trimmedAnswer = draftAnswer.trim();

    if (!trimmedAnswer || isLocked) {
      return;
    }

    onSelect(trimmedAnswer);
  }

  return (
    <div className="mt-7 max-w-md">
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-slate-700" htmlFor={`free-response-${questionId}`}>
          Your answer
        </label>
        <details className="group relative">
          <summary className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
            <Info aria-hidden="true" size={16} />
            <span className="sr-only">How to enter your answer</span>
          </summary>
          <div className="absolute left-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 shadow-lg">
            <p className="font-semibold text-slate-900">How to enter your answer</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>If you find more than one correct answer, enter only one.</li>
              <li>Up to 5 characters for a positive answer, 6 for a negative one (the minus sign counts).</li>
              <li>A fraction that doesn&apos;t fit: enter its decimal. A long decimal: cut or round it at the 4th digit.</li>
              <li>A mixed number like 3½: enter 7/2 or 3.5.</li>
              <li>No symbols such as %, $ or commas.</li>
            </ul>
          </div>
        </details>
      </div>

      <div className="mt-2 flex gap-3">
        <input
          autoComplete="off"
          className="min-h-12 w-40 rounded-lg border border-slate-400 bg-white px-3 text-lg text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          disabled={isLocked}
          id={`free-response-${questionId}`}
          inputMode="decimal"
          maxLength={6}
          onChange={(event) => setDraftAnswer(event.target.value.replace(/[^0-9./-]/g, ""))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              submitFreeResponse();
            }
          }}
          placeholder="Answer"
          value={draftAnswer}
        />
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          disabled={!draftAnswer.trim() || isLocked}
          onClick={submitFreeResponse}
          type="button"
        >
          {mode === "practice" ? "Check" : "Save"}
          <Send size={16} />
        </button>
      </div>

      {preview ? (
        <p className="mt-3 flex items-center gap-3 text-sm text-slate-600">
          Answer preview:
          <MathText className="text-xl text-slate-950" inline text={preview} />
        </p>
      ) : null}
    </div>
  );
}

/** "-7/2" -> "\(-\frac{7}{2}\)", like the answer preview in Bluebook */
function answerPreview(value: string) {
  const text = value.trim();

  if (!text) return "";

  const fraction = text.match(/^(-?)(\d*\.?\d*)\/(\d*\.?\d*)$/);
  if (fraction) return `\\(${fraction[1]}\\frac{${fraction[2] || "\\square"}}{${fraction[3] || "\\square"}}\\)`;

  return `\\(${text}\\)`;
}
