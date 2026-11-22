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
  const invitation = next && /^\/(?:join|live)\/[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(next);
  const course = next && (/^\/(?:course(?:\/(?:texts|hard-questions|practice-tests|useful))?|homework|vocabulary|materials)$/.test(next) || /^\/course\/texts\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(next));
  return next && (invitation || course) ? next : "/question-bank";
}
