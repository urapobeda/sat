import type { QuestionSummary } from "@/types/sat";
export type HardQuestion = QuestionSummary & { question_id: string; marked: boolean; mistake_count: number; preview: string };
export function hardQuestionMatches(item: HardQuestion, section: string, search: string) {
  return (section === "all" || item.section === section) && `${item.topic} ${item.preview}`.toLowerCase().includes(search.trim().toLowerCase());
}
export function parseHardQuestionIds(value: string | null) {
  if (!value) return null;
  const ids = [...new Set(value.split(","))];
  if (ids.length > 100 || ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) throw new Error("Choose up to 100 valid questions.");
  return new Set(ids);
}
export function hardPracticeHref(ids?: string[], section = "all", search = "") {
  const query = new URLSearchParams({ collection: "hard" });
  if (ids?.length) { parseHardQuestionIds(ids.join(",")); query.set("ids", ids.join(",")); }
  else { if (section !== "all") query.set("section", section); if (search.trim()) query.set("hardQuery", search.trim().slice(0,200)); }
  return `/question-bank/practice?${query}`;
}
