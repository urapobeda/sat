import { notFound } from "next/navigation";
const sections: Record<string, [string, string]> = {
  groups: ["Groups", "Group management is coming soon."],
  students: ["Students", "A list of students and their progress is coming soon."],
  materials: ["Materials", "Materials management is coming soon."]
};
export default async function TeacherSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const content = Object.hasOwn(sections, section) ? sections[section] : null;
  if (!content) notFound();
  return <section className="hub-card p-6"><h1 className="text-3xl font-bold">{content[0]}</h1><p className="mt-3 text-slate-600">{content[1]}</p></section>;
}
