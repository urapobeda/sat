export type RecordingRow = {
  title: string;
  date: string;
  group: string;
  length: string;
};

// Placeholder data standing in for a future lesson-recordings table in
// Supabase, tied to the lessons/schedule model that does not exist yet.
export const recordings: RecordingRow[] = [
  {
    title: "Boundaries and Linear Equations",
    date: "Thu, Oct 28",
    group: "SAT Group · October",
    length: "1h 28m"
  },
  {
    title: "Words in Context strategy session",
    date: "Mon, Oct 26",
    group: "SAT Group · October",
    length: "1h 31m"
  },
  {
    title: "Systems of equations workshop",
    date: "Thu, Oct 21",
    group: "SAT Group · October",
    length: "1h 25m"
  },
  {
    title: "Rhetorical synthesis and transitions",
    date: "Mon, Oct 19",
    group: "SAT Group · October",
    length: "1h 33m"
  },
  {
    title: "Right triangles and trigonometry",
    date: "Thu, Oct 14",
    group: "SAT Group · October",
    length: "1h 29m"
  }
];
