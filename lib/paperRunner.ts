export type PaperItem = {
  id: string;
  module_id: string;
  position: number;
  question_type: "multiple-choice" | "student-produced-response";
  text: string;
  image_paths: string[];
};

export type PaperSolution = {
  item_id: string;
  accepted_answers: string[];
};

/** Decimal entries fill the available five positive / six signed characters.
 * https://satsuite.collegeboard.org/media/pdf/english-sat-test-directions-bb.pdf
 */
export function paperAcceptedAnswers(source: string[]) {
  const accepted = new Set(source);
  for (const answer of source) {
    const fraction = answer.match(/^(-?\d+)\/(\d+)$/);
    if (!fraction || Number(fraction[2]) === 0) continue;
    const value = Number(fraction[1]) / Number(fraction[2]);
    const magnitude = Math.abs(value);
    const wholeDigits = magnitude >= 1 ? Math.floor(Math.log10(magnitude)) + 1 : 1;
    const decimalPlaces = magnitude < 1 ? [3, 4] : [Math.max(0, 4 - wholeDigits)];
    for (const places of decimalPlaces) {
      const factor = 10 ** places;
      const sign = value < 0 ? -1 : 1;
      accepted.add(String(sign * Math.trunc(magnitude * factor) / factor));
      accepted.add(String(sign * Math.round(magnitude * factor) / factor));
    }
  }
  return [...accepted];
}

export type PaperModuleRun = {
  attempt_id: string;
  module_id: string;
  ordinal: number;
  answers: Record<string, string>;
  flags: Record<string, boolean>;
  current_index: number;
  revision: number;
  started_at: string | null;
  deadline: string | null;
  completed_at: string | null;
  score: number | null;
  graded: Record<string, boolean> | null;
};

export type PaperRunnerSnapshot = {
  userId: string;
  title: string;
  attemptId: string;
  completed: boolean;
  modules: Array<{
    id: string;
    section: "math" | "reading-writing";
    module_number: number;
    question_count: number;
    run: PaperModuleRun;
  }>;
  current: string | null;
  items: Array<PaperItem & { images: string[] }>;
  review: Array<{ id: string; position: number; selected: string; accepted: string[]; correct: boolean }>;
};
