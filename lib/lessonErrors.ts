/** Russian message for a failed Supabase write on lessons/materials. */
export function lessonWriteError(error: unknown, fallback: string) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  const message = typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : "";
  if (code === "42501" || /row-level security|permission denied/i.test(message)) return "Нет доступа к этой группе.";
  if (/another group/i.test(message)) return "Урок относится к другой группе.";
  if (code === "23514" || code === "22P02" || code === "22007") return "Проверьте поля: ссылки должны начинаться с https://, длительность от 15 до 480 минут.";
  if (code === "23503") return "Группа или урок больше не существует. Обновите страницу.";
  return fallback;
}
