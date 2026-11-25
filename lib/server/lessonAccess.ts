import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";

export const lessonSaveSchema = z.object({
  groupId: z.uuid(), title: z.string().trim().min(1).max(200),
  section: z.enum(["math", "reading_writing", "general"]), topic: z.string().trim().max(200),
  startsAt: z.iso.datetime({ offset: true }).nullable(), position: z.number().int().min(1).max(100000),
  notes: z.string().max(5000), items: z.array(z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("question"), part: z.enum(["classwork", "homework"]), questionId: z.uuid() }),
    z.object({ kind: z.literal("text"), part: z.enum(["classwork", "homework"]), title: z.string().trim().max(200), body: z.string().trim().max(5000) }).refine(item => Boolean(item.title || item.body))
  ])).max(200)
}).refine(value => ["classwork", "homework"].every(part => {
  const ids = value.items.flatMap(item => item.part === part && item.kind === "question" ? [item.questionId] : []);
  return ids.length <= 100 && ids.length === new Set(ids).size;
}));
export function lessonSaveArgs(body: z.infer<typeof lessonSaveSchema>, id: string | null) {
  return { p_id: id, p_group_id: body.groupId, p_title: body.title, p_section: body.section,
    p_topic: body.topic, p_starts_at: body.startsAt, p_position: body.position, p_notes: body.notes,
    p_items: body.items.map(item => item.kind === "question" ? { part: item.part, questionId: item.questionId } : { part: item.part, title: item.title, body: item.body }) };
}
export function lessonError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const status = code === "42501" ? 403 : ["22023", "23514", "23503", "23505"].includes(code) ? 400 : 503;
  const message = typeof error === "object" && error !== null && "message" in error ? String(error.message) : "";
  const validation: Record<string, string> = {
    "The combined instructions exceed 5000 characters": "The text blocks and comment together must be no longer than 5,000 characters.",
    "Choose a part with 1 to 100 questions": "Add between 1 and 100 questions to the selected part before assigning it.",
    "Choose an active group with students": "Choose an active group with at least one student."
  };
  return NextResponse.json({ error: status === 403 ? "You do not have access to this lesson." : status === 400 ? (Object.hasOwn(validation, message) ? validation[message] : "Check the lesson settings and selected questions.") : "Could not load or save lessons. Please try again." }, { status });
}
export async function allLessonRows<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await read(offset, offset + 999);
    if (page.error) throw page.error;
    rows.push(...page.data ?? []);
    if ((page.data?.length ?? 0) < 1000) return rows;
  }
}
