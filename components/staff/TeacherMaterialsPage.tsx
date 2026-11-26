"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { MATERIAL_ICON } from "@/components/dashboard/TeacherMaterials";
import { guessMaterialKind, isHttpsUrl, MATERIAL_KIND_LABEL, MATERIAL_KINDS, type GroupMaterial, type MaterialKind } from "@/lib/lessons";
import { lessonWriteError } from "@/lib/lessonErrors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatAlmaty } from "@/lib/timezone";
import { useGroupLessons } from "@/lib/useGroupLessons";

const input = "min-h-11 rounded-xl border border-slate-200 bg-transparent px-3";
const label = "flex min-w-0 flex-col gap-1 text-sm font-medium";

export function TeacherMaterialsPage() {
  const { data, error, loading, reload } = useGroupLessons();
  const groups = useMemo(() => (data?.groups ?? []).filter((group) => !group.archived), [data]);
  const groupName = useMemo(() => new Map((data?.groups ?? []).map((group) => [group.id, group.name])), [data]);
  const lessonTitle = useMemo(() => new Map((data?.lessons ?? []).map((lesson) => [lesson.id, `${lesson.title} · ${formatAlmaty(lesson.starts_at)}`])), [data]);
  const [chosenGroup, setGroup] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<MaterialKind | "">("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState("all");

  const groupId = chosenGroup || groups[0]?.id || "";
  const groupLessons = (data?.lessons ?? []).filter((lesson) => lesson.group_id === groupId).slice().reverse();
  const materials = (data?.materials ?? []).filter((material) => filter === "all" || material.group_id === filter);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!groupId) { setMessage({ kind: "error", text: "Сначала создайте группу." }); return; }
    if (!title.trim()) { setMessage({ kind: "error", text: "Введите название." }); return; }
    if (!isHttpsUrl(url)) { setMessage({ kind: "error", text: "Вставьте ссылку, которая начинается с https:// (Google Drive, YouTube, Docs…)." }); return; }
    setSaving(true); setMessage(null);
    const { error: failure } = await getSupabaseBrowserClient().from("group_materials").insert({
      group_id: groupId, lesson_id: lessonId || null, title: title.trim(), url: url.trim(),
      kind: kind || guessMaterialKind(url), description: description.trim() || null
    });
    setSaving(false);
    if (failure) { setMessage({ kind: "error", text: lessonWriteError(failure, "Не удалось добавить материал.") }); return; }
    setTitle(""); setUrl(""); setKind(""); setDescription(""); setLessonId("");
    setMessage({ kind: "ok", text: "Материал добавлен — ученики группы уже видят его в «Materials»." });
    reload();
  }

  async function remove(material: GroupMaterial) {
    if (!window.confirm(`Убрать «${material.title}» у учеников? Сам файл по ссылке не удалится.`)) return;
    const { error: failure } = await getSupabaseBrowserClient().from("group_materials").delete().eq("id", material.id);
    setMessage(failure ? { kind: "error", text: lessonWriteError(failure, "Не удалось удалить материал.") } : { kind: "ok", text: "Материал убран." });
    reload();
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Материалы</h1>
        <p className="mt-2 text-sm text-slate-600">Делитесь ссылками на Google Drive, Docs, YouTube и т. п. Файлы не загружаются на сайт, поэтому не занимают место в Supabase.</p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-rose-600">Не удалось загрузить материалы. Если вы только что обновили сайт, выполните миграцию add_lessons_and_materials.sql в Supabase. <button type="button" className="cursor-pointer underline" onClick={reload}>Повторить</button></p>
      ) : loading ? <p role="status">Загрузка…</p> : !groups.length ? (
        <div className="hub-card p-6 text-sm text-slate-600">Сначала создайте группу в разделе «Группы».</div>
      ) : (
        <form onSubmit={submit} className="hub-card grid gap-3 p-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Новый материал</h2>
          <label className={label}>Группа
            <select className={input} value={groupId} onChange={(event) => { setGroup(event.target.value); setLessonId(""); }}>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          <label className={label}>К уроку (необязательно)
            <select className={input} value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
              <option value="">— без урока —</option>
              {groupLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lessonTitle.get(lesson.id)}</option>)}
            </select>
          </label>
          <label className={label}>Название<input className={input} maxLength={150} required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, Конспект: Transitions" /></label>
          <label className={label}>Ссылка<input className={input} inputMode="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://drive.google.com/…" /></label>
          <label className={label}>Тип
            <select className={input} value={kind} onChange={(event) => setKind(event.target.value as MaterialKind | "")}>
              <option value="">Определить автоматически{url ? ` (${MATERIAL_KIND_LABEL[guessMaterialKind(url)]})` : ""}</option>
              {MATERIAL_KINDS.map((item) => <option key={item} value={item}>{MATERIAL_KIND_LABEL[item]}</option>)}
            </select>
          </label>
          <label className={label}>Описание<input className={input} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Необязательно" /></label>
          <p className="text-xs text-slate-500 sm:col-span-2">Для Google Drive откройте доступ «Все, у кого есть ссылка», иначе ученики не смогут открыть файл.</p>
          <div className="sm:col-span-2"><button className="hub-primary cursor-pointer disabled:opacity-50" disabled={saving} type="submit">{saving ? "Сохранение…" : "Добавить материал"}</button></div>
        </form>
      )}

      {message ? <p role={message.kind === "error" ? "alert" : "status"} className={`text-sm ${message.kind === "error" ? "text-rose-600" : "text-emerald-700"}`}>{message.text}</p> : null}

      {data && groups.length ? (
        <div className="hub-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Все материалы · {materials.length}</h2>
            <select aria-label="Фильтр по группе" className="min-h-9 rounded-lg border border-slate-200 bg-transparent px-2 text-sm" value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">Все группы</option>
              {data.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </div>
          {materials.length ? (
            <ul className="mt-2 divide-y divide-slate-100">
              {materials.map((material) => {
                const Icon = MATERIAL_ICON[material.kind];
                return (
                  <li key={material.id} className="flex items-start gap-3 py-3">
                    <span className="hub-icon"><Icon aria-hidden="true" size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <a className="inline-flex items-center gap-1 break-words font-medium hover:underline" href={material.url} target="_blank" rel="noopener noreferrer">{material.title}<ExternalLink size={13} aria-hidden="true" /></a>
                      <p className="text-xs text-slate-500">
                        {MATERIAL_KIND_LABEL[material.kind]} · {groupName.get(material.group_id) ?? "Группа"}
                        {material.lesson_id && lessonTitle.get(material.lesson_id) ? ` · ${lessonTitle.get(material.lesson_id)}` : ""} · {formatAlmaty(material.created_at)}
                      </p>
                      {material.description ? <p className="mt-0.5 break-words text-sm text-slate-600">{material.description}</p> : null}
                    </div>
                    <button aria-label="Удалить" className="cursor-pointer rounded-lg p-1.5 text-rose-600 hover:bg-rose-50" type="button" onClick={() => remove(material)}><Trash2 size={15} /></button>
                  </li>
                );
              })}
            </ul>
          ) : <p className="mt-2 text-sm text-slate-600">Материалов пока нет.</p>}
        </div>
      ) : null}
    </section>
  );
}
