import { normalizeTopic } from "@/lib/questions";

export type MistakeTopic = {
  topic: string;
  section: "math" | "reading-writing";
  sectionLabel: string;
  missedCount: number;
  accuracy: number;
  lastMissed: string;
};

// Placeholder data standing in for a future missed-answers aggregation
// query against practice_answers / test_answers in Supabase.
export const mistakeTopics: MistakeTopic[] = [
  {
    topic: "Boundaries",
    section: "reading-writing",
    sectionLabel: "Reading & Writing",
    missedCount: 6,
    accuracy: 52,
    lastMissed: "Oct 27"
  },
  {
    topic: "Nonlinear functions",
    section: "math",
    sectionLabel: "Math",
    missedCount: 4,
    accuracy: 61,
    lastMissed: "Oct 29"
  },
  {
    topic: "Inferences",
    section: "reading-writing",
    sectionLabel: "Reading & Writing",
    missedCount: 3,
    accuracy: 64,
    lastMissed: "Oct 24"
  },
  {
    topic: "Circles",
    section: "math",
    sectionLabel: "Math",
    missedCount: 2,
    accuracy: 67,
    lastMissed: "Oct 20"
  },
  {
    topic: "Linear Equations in One Variable",
    section: "math",
    sectionLabel: "Math",
    missedCount: 2,
    accuracy: 78,
    lastMissed: "Oct 15"
  }
];

export function getMistakePracticeHref(topic: MistakeTopic) {
  return `/question-bank/practice?section=${topic.section}&topic=${normalizeTopic(topic.topic)}`;
}
