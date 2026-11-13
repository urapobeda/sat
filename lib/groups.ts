export type StudyGroup = {
  id: string; name: string; teacher_id: string; teacher_name: string;
  join_code: string; archived: boolean; created_at: string; member_count: number;
};
export type GroupMember = { student_id: string; full_name: string; avatar_url: string | null; joined_at: string };
export type GroupTeacher = { id: string; full_name: string };
export const GROUP_CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;
export function normalizeGroupCode(code: string) { return code.trim().toUpperCase(); }
export function getAuthReturnPath(search: string) {
  const next = new URLSearchParams(search).get("next");
  return next && /^\/join\/[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(next) ? next : "/question-bank";
}
