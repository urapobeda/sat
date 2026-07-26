import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildPaperWithStats, type PaperWithStats } from "@/lib/pastPapers";
import type {
  ExamAttempt,
  ExamModuleQuestion,
  PaperBookmark
} from "@/types/database";

export type PaperDetail = PaperWithStats & {
  moduleQuestions: ExamModuleQuestion[];
};

export async function getPublishedPapers(userId?: string | null) {
  const supabase = getSupabaseBrowserClient();
  const { data: papers, error: papersError } = await supabase
    .from("exam_papers")
    .select("*")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (papersError) {
    throw new Error(papersError.message);
  }

  const paperRows = papers ?? [];

  if (paperRows.length === 0) {
    return [];
  }

  const paperIds = paperRows.map((paper) => paper.id);
  const [moduleResult, attemptResult, bookmarkResult] = await Promise.all([
    supabase
      .from("exam_modules")
      .select("*")
      .in("paper_id", paperIds)
      .order("sort_order", { ascending: true }),
    userId
      ? supabase
          .from("exam_attempts")
          .select("*")
          .eq("user_id", userId)
          .in("paper_id", paperIds)
      : Promise.resolve({ data: [] as ExamAttempt[], error: null }),
    userId
      ? supabase
          .from("paper_bookmarks")
          .select("*")
          .eq("user_id", userId)
          .in("paper_id", paperIds)
      : Promise.resolve({ data: [] as PaperBookmark[], error: null })
  ]);

  if (moduleResult.error || attemptResult.error || bookmarkResult.error) {
    throw new Error(
      moduleResult.error?.message ??
        attemptResult.error?.message ??
        bookmarkResult.error?.message ??
        "Unable to load paper metadata."
    );
  }

  return paperRows.map((paper) =>
    buildPaperWithStats({
      attempts: (attemptResult.data ?? []).filter(
        (attempt) => attempt.paper_id === paper.id
      ),
      isBookmarked: (bookmarkResult.data ?? []).some(
        (bookmark) => bookmark.paper_id === paper.id
      ),
      modules: (moduleResult.data ?? []).filter(
        (module) => module.paper_id === paper.id
      ),
      paper
    })
  );
}

export async function getPublishedPaperBySlug(
  slug: string,
  userId?: string | null
): Promise<PaperDetail | null> {
  const supabase = getSupabaseBrowserClient();
  const { data: paper, error: paperError } = await supabase
    .from("exam_papers")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (paperError) {
    throw new Error(paperError.message);
  }

  if (!paper) {
    return null;
  }

  const [moduleResult, attemptResult, bookmarkResult] = await Promise.all([
    supabase
      .from("exam_modules")
      .select("*")
      .eq("paper_id", paper.id)
      .order("sort_order", { ascending: true }),
    userId
      ? supabase
          .from("exam_attempts")
          .select("*")
          .eq("user_id", userId)
          .eq("paper_id", paper.id)
          .order("started_at", { ascending: false })
      : Promise.resolve({ data: [] as ExamAttempt[], error: null }),
    userId
      ? supabase
          .from("paper_bookmarks")
          .select("*")
          .eq("user_id", userId)
          .eq("paper_id", paper.id)
      : Promise.resolve({ data: [] as PaperBookmark[], error: null })
  ]);

  if (moduleResult.error || attemptResult.error || bookmarkResult.error) {
    throw new Error(
      moduleResult.error?.message ??
        attemptResult.error?.message ??
        bookmarkResult.error?.message ??
        "Unable to load paper details."
    );
  }

  const modules = moduleResult.data ?? [];
  const moduleIds = modules.map((module) => module.id);
  const { data: moduleQuestions, error: moduleQuestionsError } =
    moduleIds.length > 0
      ? await supabase
          .from("exam_module_questions")
          .select("*")
          .in("module_id", moduleIds)
          .order("sort_order", { ascending: true })
      : { data: [] as ExamModuleQuestion[], error: null };

  if (moduleQuestionsError) {
    throw new Error(moduleQuestionsError.message);
  }

  return {
    ...buildPaperWithStats({
      attempts: attemptResult.data ?? [],
      isBookmarked: (bookmarkResult.data ?? []).length > 0,
      modules,
      paper
    }),
    moduleQuestions: moduleQuestions ?? []
  };
}

export async function togglePaperBookmark({
  isBookmarked,
  paperId,
  userId
}: {
  isBookmarked: boolean;
  paperId: string;
  userId: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const result = isBookmarked
    ? await supabase
        .from("paper_bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("paper_id", paperId)
    : await supabase.from("paper_bookmarks").insert({
        paper_id: paperId,
        user_id: userId
      });

  if (result.error) {
    throw new Error(result.error.message);
  }
}
