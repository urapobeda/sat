export type LessonRow = {
  date: string;
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
    date: "Mon, Nov 2",
    time: "6:00 PM",
    duration: "90 minutes",
    group: "SAT Group · November",
    topic: "Inferences and Command of Evidence: Practice Test #4 review",
    status: "upcoming",
    hasRecording: false
  },
  {
    date: "Thu, Nov 5",
    time: "6:00 PM",
    duration: "90 minutes",
    group: "SAT Group · November",
    topic: "Nonlinear functions deep dive",
    status: "upcoming",
    hasRecording: false
  },
  {
    date: "Mon, Nov 9",
    time: "6:00 PM",
    duration: "90 minutes",
    group: "SAT Group · November",
    topic: "Mini test #7 review",
    status: "upcoming",
    hasRecording: false
  },
  {
    date: "Thu, Oct 28",
    time: "6:00 PM",
    duration: "90 minutes",
    group: "SAT Group · October",
    topic: "Boundaries and Linear Equations",
    status: "completed",
    hasRecording: true
  },
  {
    date: "Mon, Oct 26",
    time: "6:00 PM",
    duration: "90 minutes",
    group: "SAT Group · October",
    topic: "Words in Context strategy session",
    status: "completed",
    hasRecording: true
  },
  {
    date: "Thu, Oct 21",
    time: "6:00 PM",
    duration: "90 minutes",
    group: "SAT Group · October",
    topic: "Systems of equations workshop",
    status: "completed",
    hasRecording: true
  }
];
