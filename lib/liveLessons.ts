import type { Question } from "@/types/sat";
export const LIVE_CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;
export type LiveSession = {
  id: string; lesson_id: string; group_id: string; status: "active" | "finished";
  current_position: number; join_code: string; question_ids: string[]; revealed_positions: number[];
  started_at: string; finished_at: string | null;
};
export type LiveAnswer = { session_id: string; question_id: string; student_id: string; choice: string; is_correct: boolean; created_at: string };
export type LiveRoster = { session_id: string; student_id: string; full_name: string };
export type LiveSnapshot = {
  session: LiveSession; lesson_title: string; staff: boolean;
  own_answer: { question_id: string; choice: string; is_correct: boolean | null } | null;
  own_correct: number | null; roster?: LiveRoster[]; answers?: LiveAnswer[];
  question: Question; correct_answer?: string;
};
export function liveAnsweredLabel(answered: number, total: number) {
  return total > 0 && answered >= total ? "Everyone answered" : `${answered} of ${total} answered`;
}
export function liveGroupRows(snapshot: Pick<LiveSnapshot, "session" | "roster" | "answers">) {
  const answers = new Map((snapshot.answers ?? []).map(answer => [`${answer.student_id}:${answer.question_id}`, answer]));
  return (snapshot.roster ?? []).map(student => {
    const cells = snapshot.session.question_ids.map(id => answers.get(`${student.student_id}:${id}`) ?? null);
    return { ...student, cells, correct: cells.filter(answer => answer?.is_correct).length };
  });
}
