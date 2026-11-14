import type { AssignmentFeedback } from "@/lib/assignmentReport";
import { formatAlmaty } from "@/lib/timezone";
export function AssignmentFeedbackList({ feedback, questionIds }: { feedback: AssignmentFeedback[]; questionIds: string[] }) {
  if (!feedback.length) return null;
  return <section className="hub-card space-y-3 p-5" aria-label="Комментарии учителя"><h2 className="text-lg font-semibold">Комментарии учителя</h2>{feedback.map((item) => <article className="rounded-xl border border-slate-200 p-3" key={item.id}><p className="text-xs text-slate-500">{item.question_id ? `Вопрос ${questionIds.indexOf(item.question_id) >= 0 ? questionIds.indexOf(item.question_id) + 1 : "из предыдущей версии задания"}` : "Работа целиком"} · {formatAlmaty(item.created_at)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.body}</p></article>)}</section>;
}
