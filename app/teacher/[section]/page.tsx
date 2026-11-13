import { notFound } from "next/navigation";
const sections: Record<string, [string, string]> = {
  groups: ["Группы", "Скоро здесь можно будет управлять учебными группами."],
  homework: ["Домашки", "Скоро здесь можно будет назначать домашние задания."],
  students: ["Ученики", "Скоро здесь появится список учеников и их прогресс."],
  schedule: ["Расписание", "Скоро здесь появится расписание занятий."],
  materials: ["Материалы", "Скоро здесь можно будет управлять учебными материалами."]
};
export default async function TeacherSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const content = Object.hasOwn(sections, section) ? sections[section] : null;
  if (!content) notFound();
  return <section className="hub-card p-6"><h1 className="text-3xl font-bold">{content[0]}</h1><p className="mt-3 text-slate-600 dark:text-slate-300">{content[1]}</p></section>;
}
