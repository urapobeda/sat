"use client";

import { ExternalLink, FileText, FileSpreadsheet, Link2, Presentation, Video } from "lucide-react";
import { useMemo } from "react";
import { MATERIAL_KIND_LABEL, type MaterialKind } from "@/lib/lessons";
import { formatAlmaty } from "@/lib/timezone";
import { useGroupLessons } from "@/lib/useGroupLessons";

export const MATERIAL_ICON: Record<MaterialKind, typeof FileText> = {
  link: Link2, pdf: FileText, video: Video, doc: FileText, sheet: FileSpreadsheet, slides: Presentation
};

/** Links the teacher shared with the student's groups. */
export function TeacherMaterials() {
  const { data, error, loading, signedIn, reload } = useGroupLessons();
  const groupName = useMemo(() => new Map((data?.groups ?? []).map((group) => [group.id, group.name])), [data]);
  const lessonTitle = useMemo(() => new Map((data?.lessons ?? []).map((lesson) => [lesson.id, lesson.title])), [data]);
  const materials = data?.materials ?? [];

  return (
    <section aria-labelledby="teacher-materials" className="hub-card p-5">
      <h2 className="font-semibold text-slate-950" id="teacher-materials">From your teacher</h2>
      {!signedIn && !loading ? (
        <p className="mt-1 text-sm text-slate-600">Sign in to see the files your teacher shared.</p>
      ) : error ? (
        <p className="mt-1 text-sm text-rose-600" role="alert">Could not load materials. <button className="cursor-pointer underline" onClick={reload} type="button">Try again</button></p>
      ) : loading ? (
        <p className="mt-1 text-sm text-slate-600" role="status">Loading…</p>
      ) : !materials.length ? (
        <p className="mt-1 text-sm text-slate-600">{data?.groups.length ? "Your teacher has not shared any materials yet." : "Join a group with your teacher's code to see shared materials."}</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {materials.map((material) => {
            const Icon = MATERIAL_ICON[material.kind] ?? Link2;
            const lesson = material.lesson_id ? lessonTitle.get(material.lesson_id) : undefined;
            return (
              <li key={material.id}>
                <a className="hub-resource-link flex min-w-0 gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-blue-300" href={material.url} rel="noopener noreferrer" target="_blank">
                  <span className="hub-icon"><Icon aria-hidden="true" size={19} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="hub-eyebrow">{MATERIAL_KIND_LABEL[material.kind]} · {groupName.get(material.group_id) ?? "Group"}</p>
                    <p className="mt-1 break-words font-semibold text-slate-950">{material.title}</p>
                    {material.description ? <p className="mt-1 break-words text-sm leading-6 text-slate-600">{material.description}</p> : null}
                    <p className="mt-1 text-xs text-slate-500">{lesson ? `Lesson: ${lesson} · ` : ""}{formatAlmaty(material.created_at)}</p>
                  </div>
                  <ExternalLink aria-hidden="true" className="shrink-0 text-slate-500" size={16} />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
