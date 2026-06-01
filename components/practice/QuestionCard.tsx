import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Flag,
  type LucideIcon
} from "lucide-react";
import { AnswerOption } from "@/components/practice/AnswerOption";
import type { Question } from "@/data/questions";

type QuestionCardProps = {
  currentIndex: number;
  onClear: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSelect: (choice: string) => void;
  question: Question;
  selectedAnswer: string | null;
  timerLabel: string;
  totalQuestions: number;
};

export function QuestionCard({
  currentIndex,
  onClear,
  onNext,
  onPrevious,
  onSelect,
  question,
  selectedAnswer,
  timerLabel,
  totalQuestions
}: QuestionCardProps) {
  const progress = `${((currentIndex + 1) / totalQuestions) * 100}%`;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-base font-black text-slate-600">
            Question {currentIndex + 1} of {totalQuestions}
          </p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: progress }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-blue-50 px-4 text-sm font-black text-blue-700">
            <Clock3 size={17} />
            {timerLabel}
          </span>
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            type="button"
          >
            <Flag size={17} />
            Report
          </button>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <Badge label={`Difficulty: ${capitalize(question.difficulty)}`} tone="violet" />
        <Badge label={`Section: ${formatSection(question.section)}`} tone="blue" />
      </div>

      <h2 className="mt-6 text-xl font-black leading-8 text-slate-950 sm:text-2xl sm:leading-9">
        {question.question}
      </h2>

      <div className="mt-7 grid gap-3">
        {question.choices.map((choice, index) => (
          <AnswerOption
            choice={choice}
            index={index}
            isSelected={selectedAnswer === choice}
            key={`${question.id}-${choice}`}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <NavButton
          disabled={currentIndex === 0}
          icon={ArrowLeft}
          label="Previous"
          onClick={onPrevious}
        />

        <button
          className="min-h-11 rounded-xl px-4 text-sm font-black text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
          disabled={!selectedAnswer}
          onClick={onClear}
          type="button"
        >
          Clear Answer
        </button>

        <NavButton
          align="right"
          disabled={currentIndex === totalQuestions - 1}
          icon={ArrowRight}
          label="Next"
          onClick={onNext}
          variant="primary"
        />
      </div>
    </article>
  );
}

type BadgeProps = {
  label: string;
  tone: "blue" | "violet";
};

function Badge({ label, tone }: BadgeProps) {
  const classes =
    tone === "violet"
      ? "bg-violet-50 text-violet-700"
      : "bg-blue-50 text-blue-700";

  return (
    <span className={`rounded-full px-4 py-2 text-sm font-bold ${classes}`}>
      {label}
    </span>
  );
}

type NavButtonProps = {
  align?: "left" | "right";
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
};

function NavButton({
  align = "left",
  disabled = false,
  icon: Icon,
  label,
  onClick,
  variant = "secondary"
}: NavButtonProps) {
  const classes =
    variant === "primary"
      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
      : "border border-blue-100 bg-white text-blue-600 shadow-sm hover:border-blue-200 hover:bg-blue-50 disabled:border-slate-200 disabled:text-slate-400";

  return (
    <button
      className={[
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black transition disabled:cursor-not-allowed",
        align === "right" ? "sm:justify-self-end" : "sm:justify-self-start",
        classes
      ].join(" ")}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {align === "left" ? <Icon size={18} /> : null}
      <span>{label}</span>
      {align === "right" ? <Icon size={18} /> : null}
    </button>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatSection(section: Question["section"]) {
  return section === "math" ? "Math" : "Reading & Writing";
}
