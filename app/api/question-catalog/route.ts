import { getInitialQuestionCatalog } from "@/lib/server/questionCatalog";

export const dynamic = "force-static";
export const revalidate = 300;

// Only public question metadata, shared with the Question Bank page cache.
export async function GET() {
  const catalog = await getInitialQuestionCatalog();
  if (!catalog) {
    return Response.json({ error: "Question catalog unavailable." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" }
    });
  }
  return Response.json(catalog);
}
