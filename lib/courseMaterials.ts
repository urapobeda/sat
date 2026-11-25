export type MaterialKind = "text" | "note" | "link";
export type MaterialSection = "math" | "reading_writing" | "general";
export type CourseMaterial = {
  id: string; group_id: string | null; lesson_id: string | null; created_by: string;
  kind: MaterialKind; title: string; section: MaterialSection; body: string; url: string;
  position: number; published: boolean; created_at: string; updated_at: string;
};
export type MaterialSummary = Omit<CourseMaterial, "body"> & { group_name: string | null; lesson_title: string | null };
export const MATERIAL_SECTIONS = { general: "General", math: "Math", reading_writing: "Reading & Writing" };
export function safeMaterialUrl(value: string) {
  const text = value.trim();
  if (/[\u0000-\u0020\u007f]/.test(text)) return "";
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && url.hostname ? url.href : "";
  } catch { return ""; }
}
export function safeMarkdownUrl(value: string) {
  if (/^#[\w-]+$/.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//")) {
    try { const url = new URL(value, "https://sat-hub.invalid"); if (url.origin === "https://sat-hub.invalid" && !/[\u0000-\u0020\u007f]/.test(value)) return value; } catch { return ""; }
  }
  return safeMaterialUrl(value);
}
