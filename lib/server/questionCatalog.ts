import "server-only";

import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "@/lib/supabase/client";
import { loadQuestionPages } from "@/lib/supabase/questionPagination";
import type { QuestionSummary } from "@/types/sat";

/** Public data only: safe to embed in static HTML and share in the route cache. */
export async function getInitialQuestionCatalog(): Promise<QuestionSummary[] | null> {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => fetch(input, {
          ...init,
          cache: "force-cache",
          next: { revalidate: 300, tags: ["public-question-catalog"] }
        })
      }
    });
    const result = await loadQuestionPages<QuestionSummary>(async (from, to, withCount) => {
      const response = await supabase.from("questions")
        .select("id,section,topic,difficulty", withCount ? { count: "exact" } : undefined)
        .order("created_at").order("id").range(from, to);
      return { ...response, data: response.data as QuestionSummary[] | null };
    });
    if (result.error) throw new Error(result.error.message);
    return result.data ?? [];
  } catch (error) {
    // A transient build-time outage must not prevent publishing the app.
    // The existing browser loader remains the fallback.
    console.warn("Question catalog prerender unavailable:", error instanceof Error ? error.message : "Request failed");
    return null;
  }
}
