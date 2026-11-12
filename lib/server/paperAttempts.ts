import "server-only";

import type { PaperRunnerSnapshot } from "@/lib/paperRunner";
import { isAnswerCorrect } from "@/lib/server/questionSolutions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function loadPaperAttempt(userId: string, attemptId: string): Promise<PaperRunnerSnapshot> {
  const client = getSupabaseAdminClient();
  const { data: attempt, error } = await client.from("exam_attempts").select("*")
    .eq("id", attemptId).eq("user_id", userId).maybeSingle();
  if (error || !attempt) throw new Error("Attempt unavailable");
  const [paper, modules, runs] = await Promise.all([
    client.from("exam_papers").select("title").eq("id", attempt.paper_id).single(),
    client.from("exam_modules").select("*").eq("paper_id", attempt.paper_id).order("sort_order"),
    client.from("paper_module_runs").select("*").eq("attempt_id", attemptId).order("ordinal")
  ]);
  if (paper.error || modules.error || runs.error || !runs.data?.length) throw new Error("Attempt unavailable");
  const currentId = attempt.current_module_id;
  const runByModule = new Map(runs.data.map((run) => [run.module_id, run]));
  const snapshot: PaperRunnerSnapshot = {
    userId, title: paper.data.title, attemptId, current: currentId,
    completed: attempt.status === "completed", items: [], review: [],
    modules: modules.data.flatMap((entry) => {
      const run = runByModule.get(entry.id);
      return run ? [{ ...entry, run }] : [];
    })
  };
  if (currentId) {
    const { data: items, error: itemError } = await client.from("paper_items").select("*")
      .eq("module_id", currentId).order("position");
    if (itemError || !items?.length) throw new Error("Questions unavailable");
    const paths = items.flatMap((item) => item.image_paths);
    const { data: signed, error: imageError } = await client.storage.from("paper-question-images")
      .createSignedUrls(paths, 14400);
    if (imageError || !signed || signed.some((image) => image.error || !image.signedUrl)) throw new Error("Images unavailable");
    const urls = new Map(signed.map((image) => [image.path, image.signedUrl]));
    snapshot.items = items.map((item) => ({ ...item, images: item.image_paths.map((path) => urls.get(path)!) }));
  } else if (snapshot.completed) {
    const { data: items, error: itemError } = await client.from("paper_items")
      .select("id,module_id,position").in("module_id", runs.data.map((run) => run.module_id));
    if (itemError || !items) throw new Error("Review unavailable");
    const { data: solutions, error: solutionError } = await client.from("paper_solutions").select("*")
      .in("item_id", items.map((item) => item.id));
    if (solutionError) throw new Error("Review unavailable");
    const keys = new Map(solutions.map((solution) => [solution.item_id, solution.accepted_answers]));
    snapshot.review = items.sort((a, b) => runByModule.get(a.module_id)!.ordinal - runByModule.get(b.module_id)!.ordinal || a.position - b.position)
      .map((item) => ({
        id: item.id, position: item.position, selected: runByModule.get(item.module_id)!.answers[item.id] ?? "",
        correct: runByModule.get(item.module_id)!.graded?.[item.id] === true, accepted: keys.get(item.id) ?? []
      }));
  }
  return snapshot;
}

export async function gradePaperModule(moduleId: string, answers: Record<string, string>) {
  const client = getSupabaseAdminClient();
  const { data: items, error } = await client.from("paper_items").select("id,question_type").eq("module_id", moduleId);
  if (error || !items?.length) throw new Error("Questions unavailable");
  const { data: solutions, error: solutionError } = await client.from("paper_solutions")
    .select("*").in("item_id", items.map((item) => item.id));
  if (solutionError || solutions.length !== items.length) throw new Error("Solutions unavailable");
  const byId = new Map(solutions.map((solution) => [solution.item_id, solution.accepted_answers]));
  return Object.fromEntries(items.map((item) => {
    const accepted = byId.get(item.id)!;
    const letter = item.question_type === "multiple-choice" ? accepted[0] : null;
    return [item.id, isAnswerCorrect({
      questionType: item.question_type, acceptedAnswers: accepted,
      correctAnswer: accepted[0], rawCorrectAnswer: accepted[0], correctLabel: letter,
      choices: letter ? ["A", "B", "C", "D"].map((label) => ({ label, text: label })) : [], explanation: ""
    }, answers[item.id] ?? null)];
  }));
}
