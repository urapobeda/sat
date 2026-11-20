import "server-only";
import type { NextRequest } from "next/server";
import { getApiRoleActor } from "@/lib/server/roles";
import { getSupabaseUserClient } from "@/lib/server/userClient";
import { loadQuestionPages } from "@/lib/supabase/questionPagination";
import { summarizeStudent, type ProfileData } from "@/lib/studentProfile";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function profileActor(request: NextRequest) {
  const actor = await getApiRoleActor(request);
  return actor
    ? {
        actor,
        db: getSupabaseUserClient(
          request.headers.get("authorization")!.slice(7),
        ),
      }
    : null;
}
export async function studentProfile(
  db: SupabaseClient<Database>,
  studentId: string,
  staff = false,
): Promise<ProfileData> {
  const allowed = await db.rpc("can_view_student", { p_student: studentId });
  if (allowed.error || !allowed.data) throw new Error("Forbidden");
  const p = await db.from("profiles").select("*").eq("id", studentId).single();
  if (p.error) throw p.error;
  async function rows<T>(
    query: (
      from: number,
      to: number,
      count: boolean,
    ) => PromiseLike<{
      data: T[] | null;
      error: { message: string } | null;
      count?: number | null;
    }>,
  ) {
    const result = await loadQuestionPages(query);
    if (result.error) throw new Error(result.error.message);
    return result.data ?? [];
  }
  const [
    practice,
    practiceAnswers,
    tests,
    testAnswers,
    exams,
    submissions,
    assignmentRows,
    members,
    groups,
    notes,
  ] = await Promise.all([
    rows((f, t, c) =>
      db
        .from("practice_sessions")
        .select("*", c ? { count: "exact" } : undefined)
        .eq("user_id", studentId)
        .order("id")
        .range(f, t),
    ),
    rows((f, t, c) =>
      db
        .from("practice_answers")
        .select(
          "question_id,is_correct,created_at,time_spent_seconds",
          c ? { count: "exact" } : undefined,
        )
        .eq("user_id", studentId)
        .order("id")
        .range(f, t),
    ),
    rows((f, t, c) =>
      db
        .from("test_sessions")
        .select("*", c ? { count: "exact" } : undefined)
        .eq("user_id", studentId)
        .order("id")
        .range(f, t),
    ),
    rows((f, t, c) =>
      db
        .from("test_answers")
        .select(
          "question_id,is_correct,created_at",
          c ? { count: "exact" } : undefined,
        )
        .eq("user_id", studentId)
        .order("id")
        .range(f, t),
    ),
    rows((f, t, c) =>
      db
        .from("exam_attempts")
        .select("*", c ? { count: "exact" } : undefined)
        .eq("user_id", studentId)
        .order("id")
        .range(f, t),
    ),
    rows((f, t, c) =>
      db
        .from("assignment_submissions")
        .select("*", c ? { count: "exact" } : undefined)
        .eq("student_id", studentId)
        .order("id")
        .range(f, t),
    ),
    rows((f, t, c) =>
      db
        .from("assignments")
        .select("*", c ? { count: "exact" } : undefined)
        .eq("published", true)
        .order("id")
        .range(f, t),
    ),
    db.from("group_members").select("group_id").eq("student_id", studentId),
    db.rpc("student_profile_groups", { p_student: studentId }),
    staff
      ? db
          .from("teacher_notes")
          .select("id,body,created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [members, groups, notes]) if (r.error) throw r.error;
  const ownGroups = new Set(members.data?.map((m) => m.group_id));
  const ids = [
    ...new Set([...practiceAnswers, ...testAnswers].map((a) => a.question_id)),
  ];
  const questions: {
    id: string;
    topic: string;
    section: "math" | "reading-writing";
  }[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const q = await db
      .from("questions")
      .select("id,topic,section")
      .in("id", ids.slice(offset, offset + 100));
    if (q.error) throw q.error;
    questions.push(...q.data);
  }
  let avatar: string | null = null;
  if (p.data.avatar_url?.startsWith(studentId + "/")) {
    const signed = await db.storage
      .from("avatars")
      .createSignedUrl(p.data.avatar_url, 300);
    avatar = signed.data?.signedUrl ?? null;
  }
  return {
    profile: p.data,
    avatar,
    groups: groups.data ?? [],
    notes: notes.data ?? [],
    ...summarizeStudent({
      practice,
      practiceAnswers,
      tests,
      testAnswers,
      exams,
      submissions,
      assignments: assignmentRows.filter((a) => ownGroups.has(a.group_id)),
      questions,
    }),
  };
}
