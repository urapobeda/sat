import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import type { Question } from "@/data/questions";

export type SectionFilter = "all" | Question["section"];
export type DifficultyFilter = "all" | Question["difficulty"];

type PracticeSetupProps = {
  difficulty: DifficultyFilter;
  matchingCount: number;
  onDifficultyChange: (difficulty: DifficultyFilter) => void;
  onSectionChange: (section: SectionFilter) => void;
  onStart: () => void;
  section: SectionFilter;
};

const sectionOptions: Array<{ label: string; value: SectionFilter }> = [
  { label: "All", value: "all" },
  { label: "Math", value: "math" },
  { label: "Reading and Writing", value: "reading-writing" }
];

const difficultyOptions: Array<{ label: string; value: DifficultyFilter }> = [
  { label: "All", value: "all" },
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Hard", value: "hard" }
];

export function PracticeSetup({
  difficulty,
  matchingCount,
  onDifficultyChange,
  onSectionChange,
  onStart,
  section
}: PracticeSetupProps) {
  const hasQuestions = matchingCount > 0;

  return (
    <Card className="mt-10 hover:translate-y-0">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-teal-100 bg-teal-50 text-teal-700">
            <SlidersHorizontal size={22} />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-neutral-950">
            Set up your practice
          </h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Choose a section and difficulty, then start a focused set from the
            local SAT question bank.
          </p>
        </div>

        <div className="w-full max-w-xl space-y-6">
          <FilterGroup
            label="Section"
            onChange={onSectionChange}
            options={sectionOptions}
            value={section}
          />
          <FilterGroup
            label="Difficulty"
            onChange={onDifficultyChange}
            options={difficultyOptions}
            value={difficulty}
          />

          <div className="flex flex-col gap-4 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                className={[
                  "text-sm font-semibold",
                  hasQuestions ? "text-neutral-950" : "text-rose-700"
                ].join(" ")}
              >
                {hasQuestions
                  ? `${matchingCount} question${matchingCount === 1 ? "" : "s"} ready`
                  : "No questions found for these filters"}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Changing filters resets the current practice session.
              </p>
            </div>
            <Button
              className="w-full sm:w-auto"
              disabled={!hasQuestions}
              onClick={onStart}
            >
              Start Practice
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

type FilterGroupProps<T extends string> = {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
};

function FilterGroup<T extends string>({
  label,
  onChange,
  options,
  value
}: FilterGroupProps<T>) {
  return (
    <div>
      <p className="text-sm font-bold text-neutral-950">{label}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isActive = option.value === value;

          return (
            <button
              className={[
                "min-h-11 rounded-md border px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950",
                isActive
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
              ].join(" ")}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
