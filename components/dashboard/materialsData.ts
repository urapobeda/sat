export type MaterialRow = {
  title: string;
  type: "PDF" | "Slides" | "Worksheet";
  section: "Math" | "Reading & Writing" | "General";
  uploadedDate: string;
};

// Placeholder data standing in for a future materials/resources table in
// Supabase.
export const materials: MaterialRow[] = [
  {
    title: "Nonlinear Functions Cheat Sheet",
    type: "PDF",
    section: "Math",
    uploadedDate: "Oct 29"
  },
  {
    title: "Boundaries and Punctuation Rules",
    type: "Slides",
    section: "Reading & Writing",
    uploadedDate: "Oct 27"
  },
  {
    title: "Mini Test #6 Answer Key",
    type: "PDF",
    section: "General",
    uploadedDate: "Oct 25"
  },
  {
    title: "Systems of Equations Practice Set",
    type: "Worksheet",
    section: "Math",
    uploadedDate: "Oct 21"
  },
  {
    title: "Transitions and Rhetorical Synthesis Guide",
    type: "Slides",
    section: "Reading & Writing",
    uploadedDate: "Oct 19"
  },
  {
    title: "Right Triangles and Trigonometry Formulas",
    type: "PDF",
    section: "Math",
    uploadedDate: "Oct 14"
  },
  {
    title: "SAT Study Plan Template",
    type: "Worksheet",
    section: "General",
    uploadedDate: "Oct 5"
  }
];
