import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getApiRoleActor } from "@/lib/server/roles";
import { getSupabaseUserClient } from "@/lib/server/userClient";
import { gradeQuestionAnswer, toQuestionChoices } from "@/lib/server/questionSolutions";
import { LIVE_CODE, type LiveSnapshot } from "@/lib/liveLessons";

export async function liveActor(request: NextRequest) {
  const actor = await getApiRoleActor(request);
  return actor ? { actor, db: getSupabaseUserClient(request.headers.get("authorization")!.slice(7)) } : null;
}
export function validLiveCode(code: string) { return LIVE_CODE.test(code); }
export function liveError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const status = code === "42501" ? 403 : ["40001", "23505"].includes(code) ? 409 : ["22023", "23514", "23503", "23502"].includes(code) ? 400 : 503;
  const known: Record<string, string> = {
    "Add 1 to 100 classwork questions": "Add between 1 and 100 questions to Classwork before starting.",
    "Some classwork questions have no answer key": "Some classwork questions have no answer key. Choose different questions before starting.",
    "Group has no students": "Add students to the group before starting.", "Group is archived": "Unarchive the group before starting.",
    "This is the last question": "This is the last question. Finish the session when ready."
  };
  const message = typeof error === "object" && error !== null && "message" in error ? String(error.message) : "";
  return NextResponse.json({ error: status === 403 ? "This live session is not available to your account." : status === 409 ? "The question changed or was closed. Your screen will refresh; your saved answer is kept." : status === 400 ? (Object.hasOwn(known, message) ? known[message] : "Check the live lesson settings and answer.") : "Live practice is temporarily unavailable. Please try again." }, { status });
}
export async function readLiveSnapshot(db: NonNullable<Awaited<ReturnType<typeof liveActor>>>["db"], code: string): Promise<LiveSnapshot> {
  const result = await db.rpc("get_live_snapshot", { p_code: code });
  if (result.error) throw result.error;
  const data = result.data as unknown as Omit<LiveSnapshot, "question">;
  const id = data.session.question_ids[data.session.current_position - 1];
  const row = await db.from("questions").select("id,section,topic,difficulty,question,choices,image_urls,is_bluebook,question_type").eq("id", id).single();
  if (row.error || !row.data) throw row.error ?? new Error("Question unavailable");
  const question = { id: row.data.id, section: row.data.section, topic: row.data.topic, difficulty: row.data.difficulty,
    question: row.data.question, choices: toQuestionChoices(row.data.choices), imageUrls: row.data.image_urls ?? [],
    isBluebook: row.data.is_bluebook, questionType: row.data.question_type };
  let correctAnswer: string | undefined;
  if (data.staff && data.session.revealed_positions.includes(data.session.current_position)) correctAnswer = (await gradeQuestionAnswer({ questionId: id, selectedAnswer: null })).correctAnswer;
  return { ...data, question, ...(correctAnswer === undefined ? {} : { correct_answer: correctAnswer }) };
}
