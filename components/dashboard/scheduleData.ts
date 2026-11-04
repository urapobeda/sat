export type LessonRow = {
  date: string; // ISO yyyy-mm-dd
  time: string;
  duration: string;
  group: string;
  topic: string;
  status: "upcoming" | "completed";
  hasRecording: boolean;
};

// Placeholder data standing in for a future lessons/schedule table in
// Supabase, tied to a teacher/group model that does not exist yet.
export const lessons: LessonRow[] = [
  {
    date: "2026-10-14",
    time: "6:00 PM",
    duration: "90 minutes",
    group: "SAT Group · October",
    topic: "Right triangles and trigonometry",
    status: "completed",
    hasRecording: true
  },
  {
    date: "2026-10-19",
    time: "6:00 PM",
    duration: "90 minutes",
    group: "SAT Group · October",
    topic: "Rhetorical synthesis and transitions",
    status: "completed",
    hasRecording: true
  },
  {
    date: "2026-10-21",
    time: "6:00 PM",
    duration: "90 minutes",
    group: "SAT Group · October",
    topic: "Systems of equations workshop",
    status: "completed",
    hasRecording: true
  },
  {
    date: "2026-10-26",
    time: "6:00 PM",
    duration: "90 minutes",
    group: "SAT Group · October",
    topic: "Words in Context strategy session",
    status: "completed",
    hasRecording: true
  },
  {
    date: "2026-10-28",
    time: "6:00 PM",
    duration: "90 minutes",
    group: "SAT Group · October",
    topic: "Boundaries and Linear Equations",
    status: "completed",
    hasRecording: true
  },
  {
    date: "2026-11-02",
    time: "6:00 PM",
    duration: "90 minutes",
    group: "SAT Group · November",
    topic: "Inferences and Command of Evidence: Practice Test #4 review",
    status: "upcoming",
    hasRecording: false
  },
  {
    date: "2026-11-05",
    time: "6:00 PM",
    duration: "90 minutes",
    group: "SAT Group · November",
    topic: "Nonlinear functions deep dive",
    status: "upcoming",
    hasRecording: false
  },
  {
    date: "2026-11-09",
    time: "6:00 PM",
    duration: "90 minutes",
    group: "SAT Group · November",
    topic: "Mini test #7 review",
    status: "upcoming",
    hasRecording: false
  }
];
