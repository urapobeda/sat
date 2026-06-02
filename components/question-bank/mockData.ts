import {
  BookOpen,
  Clock3,
  FileText,
  Flame,
  Grid2X2,
  type LucideIcon,
  SquareRadical
} from "lucide-react";

export type SectionKey = "all" | "math" | "reading-writing";

export type Topic = {
  description: string;
  mastery: number;
  questions: number;
  section: Exclude<SectionKey, "all">;
  title: string;
};

export const sectionTabs: Array<{
  icon: LucideIcon;
  key: SectionKey;
  label: string;
  questions: string;
}> = [
  {
    icon: Grid2X2,
    key: "all",
    label: "All Sections",
    questions: "2,340 Questions"
  },
  {
    icon: SquareRadical,
    key: "math",
    label: "Math",
    questions: "1,120 Questions"
  },
  {
    icon: BookOpen,
    key: "reading-writing",
    label: "Reading & Writing",
    questions: "1,220 Questions"
  }
];

export const topics: Topic[] = [
  {
    title: "Algebra",
    description: "Linear equations, inequalities, systems",
    section: "math",
    questions: 240,
    mastery: 72
  },
  {
    title: "Advanced Math",
    description: "Functions, sequences, complex expressions",
    section: "math",
    questions: 210,
    mastery: 61
  },
  {
    title: "Problem Solving & Data Analysis",
    description: "Ratios, rates, statistics, word problems",
    section: "math",
    questions: 280,
    mastery: 58
  },
  {
    title: "Geometry & Trigonometry",
    description: "Triangles, circles, area, trigonometric ratios",
    section: "math",
    questions: 190,
    mastery: 49
  },
  {
    title: "Grammar & Conventions",
    description: "Punctuation, agreement, sentence boundaries",
    section: "reading-writing",
    questions: 260,
    mastery: 64
  },
  {
    title: "Transitions",
    description: "Logical connections between ideas",
    section: "reading-writing",
    questions: 180,
    mastery: 42
  },
  {
    title: "Vocabulary in Context",
    description: "Word meaning, tone, and usage",
    section: "reading-writing",
    questions: 220,
    mastery: 57
  },
  {
    title: "Reading Comprehension",
    description: "Main idea, inference, evidence",
    section: "reading-writing",
    questions: 300,
    mastery: 52
  }
];

export const quickStats: Array<{
  icon: LucideIcon;
  label: string;
  tone: string;
  value: string;
}> = [
  {
    icon: FileText,
    label: "Total Questions",
    tone: "bg-blue-50 text-blue-600",
    value: "2,340"
  },
  {
    icon: Grid2X2,
    label: "Topics",
    tone: "bg-blue-50 text-blue-600",
    value: "22"
  },
  {
    icon: Clock3,
    label: "Time Practiced",
    tone: "bg-orange-50 text-orange-600",
    value: "12h 45m"
  },
  {
    icon: Flame,
    label: "Day Streak",
    tone: "bg-rose-50 text-rose-600",
    value: "7"
  }
];

export const weakAreas = [
  {
    mastery: 42,
    section: "Reading & Writing",
    title: "Transitions",
    tone: "bg-red-500"
  },
  {
    mastery: 48,
    section: "Math",
    title: "Functions",
    tone: "bg-orange-500"
  },
  {
    mastery: 51,
    section: "Reading & Writing",
    title: "Text Structure",
    tone: "bg-orange-400"
  }
];
