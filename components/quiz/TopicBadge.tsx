import type { Question } from "@/data/questions";

type TopicBadgeProps = {
  difficulty?: Question["difficulty"];
  section?: Question["section"];
  topic?: string;
};

export function TopicBadge({ difficulty, section, topic }: TopicBadgeProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {section ? (
        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
          {section === "math" ? "Math" : "Reading & Writing"}
        </span>
      ) : null}
      {topic ? (
        <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700">
          {topic}
        </span>
      ) : null}
      {difficulty ? (
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
          {capitalize(difficulty)}
        </span>
      ) : null}
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
