import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
export async function isLiveQuestionRestricted(userId: string, questionId: string) {
  const result = await getSupabaseAdminClient().rpc("question_in_active_live", { p_student: userId, p_question: questionId });
  // The additive migration creates the tables and this function in one transaction.
  // Before that migration, no live sessions can exist; retain ordinary practice.
  if (result.error && ["PGRST202", "42883"].includes(result.error.code)) return false;
  if (result.error) throw new Error("Live lesson restrictions could not be verified.");
  return result.data === true;
}
