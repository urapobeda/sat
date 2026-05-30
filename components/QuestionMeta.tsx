import { Badge } from "@/components/Badge";
import type { Question } from "@/data/questions";

export const sectionLabels: Record<Question["section"], string> = {
  math: "Math",
  "reading-writing": "Reading and Writing"
};

export const difficultyLabels: Record<Question["difficulty"], string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard"
};

const difficultyTones = {
  easy: "teal",
  medium: "amber",
  hard: "rose"
} as const;

type QuestionMetaProps = {
  difficulty: Question["difficulty"];
  section: Question["section"];
};

export function QuestionMeta({ difficulty, section }: QuestionMetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>{sectionLabels[section]}</Badge>
      <Badge className="capitalize" tone={difficultyTones[difficulty]}>
        {difficultyLabels[difficulty]}
      </Badge>
    </div>
  );
}
