import type { HomeworkRow } from "./HomeworkTable";

// Placeholder data standing in for a future homework table in Supabase.
export const homeworkRows: HomeworkRow[] = [
  {
    title: "Unit 9 · Nonlinear functions",
    meta: "Math · 22 questions · no time limit",
    due: "Today, 11:59 PM",
    dueTone: "today",
    progress: { done: 14, total: 22 },
    action: { label: "Continue", href: "/question-bank/practice", variant: "primary" }
  },
  {
    title: "Article Annotation III",
    meta: "Reading & Writing · passage + 12 questions",
    due: "Fri, Oct 30",
    dueTone: "default",
    action: { label: "Start", href: "/question-bank?section=reading-writing", variant: "outline" }
  },
  {
    title: "Mini test #6 · Module 2 (hard)",
    meta: "Test · 27 questions · 35 minutes · 1 attempt",
    due: "Sun, Nov 1",
    dueTone: "default",
    action: { label: "Start", href: "/tests/start", variant: "outline" }
  },
  {
    title: "Unit 8 · Linear equations",
    meta: "Submitted Oct 28",
    due: "Wed, Oct 28",
    dueTone: "done",
    percent: 90,
    progress: { done: 18, total: 20 },
    action: { label: "Review mistakes", href: "/progress", variant: "link" }
  },
  {
    title: "Words in Context #4",
    meta: "Graded · teacher left a comment",
    due: "Mon, Oct 26",
    dueTone: "done",
    percent: 92,
    progress: { done: 11, total: 12 },
    action: { label: "Comment", href: "/progress", variant: "link" }
  },
  {
    title: "Boundaries Drill #2",
    meta: "Reading & Writing · 15 questions · no time limit",
    due: "Thu, Oct 22",
    dueTone: "done",
    percent: 73,
    progress: { done: 11, total: 15 },
    action: { label: "Review mistakes", href: "/progress", variant: "link" }
  },
  {
    title: "Unit 7 · Systems of equations",
    meta: "Math · 18 questions · no time limit",
    due: "Mon, Oct 19",
    dueTone: "done",
    percent: 85,
    progress: { done: 15, total: 18 },
    action: { label: "Review mistakes", href: "/progress", variant: "link" }
  },
  {
    title: "Mini test #5 · Module 1",
    meta: "Test · 27 questions · 35 minutes · 1 attempt",
    due: "Sun, Oct 18",
    dueTone: "done",
    percent: 81,
    progress: { done: 22, total: 27 },
    action: { label: "Review mistakes", href: "/progress", variant: "link" }
  }
];
