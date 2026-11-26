/** Schedule, lesson recordings and materials for a study group (supabase/migrations/add_lessons_and_materials.sql). */
export type GroupLesson = {
  id: string;
  group_id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  recording_url: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type MaterialKind = "link" | "pdf" | "video" | "doc" | "sheet" | "slides";

export type GroupMaterial = {
  id: string;
  group_id: string;
  lesson_id: string | null;
  title: string;
  url: string;
  kind: MaterialKind;
  description: string | null;
  created_by: string;
  created_at: string;
};

export type LessonGroupSummary = { id: string; name: string; archived: boolean };

export type LessonsPayload = {
  groups: LessonGroupSummary[];
  lessons: GroupLesson[];
  materials: GroupMaterial[];
};

export const MATERIAL_KIND_LABEL: Record<MaterialKind, string> = {
  link: "Ссылка",
  pdf: "PDF",
  video: "Видео",
  doc: "Документ",
  sheet: "Таблица",
  slides: "Презентация"
};

export const MATERIAL_KINDS = Object.keys(MATERIAL_KIND_LABEL) as MaterialKind[];

/** Only https links are stored (the database checks this too). */
export function isHttpsUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !/\s/.test(value.trim());
  } catch {
    return false;
  }
}

/** Guess the kind from a pasted link so the teacher rarely has to pick it. */
export function guessMaterialKind(value: string): MaterialKind {
  const url = value.toLowerCase();
  if (/youtube\.com|youtu\.be|vimeo\.com|loom\.com/.test(url)) return "video";
  if (/\.pdf($|\?)/.test(url)) return "pdf";
  if (/docs\.google\.com\/spreadsheets/.test(url)) return "sheet";
  if (/docs\.google\.com\/presentation|\.pptx?($|\?)/.test(url)) return "slides";
  if (/docs\.google\.com\/document|\.docx?($|\?)/.test(url)) return "doc";
  return "link";
}

export function lessonEndsAt(lesson: Pick<GroupLesson, "starts_at" | "duration_minutes">) {
  return new Date(new Date(lesson.starts_at).getTime() + lesson.duration_minutes * 60_000);
}

export type LessonStatus = "upcoming" | "live" | "past";

export function lessonStatus(lesson: Pick<GroupLesson, "starts_at" | "duration_minutes">, now = new Date()): LessonStatus {
  const start = new Date(lesson.starts_at).getTime();
  const end = lessonEndsAt(lesson).getTime();
  const time = now.getTime();
  // the join link becomes useful 15 minutes before the start
  if (time >= start - 15 * 60_000 && time <= end) return "live";
  return time < start ? "upcoming" : "past";
}
