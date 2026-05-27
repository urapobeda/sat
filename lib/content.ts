import {
  BookOpenText,
  Calculator,
  ClipboardCheck,
  LineChart,
  PenLine,
  Timer
} from "lucide-react";

export const practiceAreas = [
  {
    title: "Math",
    description: "Algebra, advanced math, problem solving, and data analysis.",
    icon: Calculator,
    tone: "bg-teal-50 text-teal-700 border-teal-100"
  },
  {
    title: "Reading and Writing",
    description: "Craft, structure, information, ideas, grammar, and expression.",
    icon: BookOpenText,
    tone: "bg-violet-50 text-violet-700 border-violet-100"
  },
  {
    title: "Mixed Practice",
    description: "Short focused sets that combine timing, review, and accuracy.",
    icon: PenLine,
    tone: "bg-amber-50 text-amber-700 border-amber-100"
  }
];

export const testPlans = [
  {
    title: "Diagnostic Test",
    description: "A balanced first check to find strengths and weak spots.",
    meta: "98 questions",
    icon: ClipboardCheck
  },
  {
    title: "Timed Math Section",
    description: "Practice pacing with calculator and no-calculator style prompts.",
    meta: "35 minutes",
    icon: Timer
  },
  {
    title: "Full Practice Test",
    description: "A complete SAT-style session for endurance and review.",
    meta: "2h 14m",
    icon: LineChart
  }
];

export const progressStats = [
  { label: "Questions solved", value: "0", accent: "text-teal-700" },
  { label: "Tests completed", value: "0", accent: "text-violet-700" },
  { label: "Study streak", value: "0 days", accent: "text-amber-700" }
];
