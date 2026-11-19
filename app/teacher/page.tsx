import type { Metadata } from "next";

export const metadata: Metadata = { title: "Teacher" };
export default function TeacherOverview() {
  return <section className="hub-card p-6"><h1 className="text-3xl font-bold">Overview</h1><p className="mt-3 text-slate-600">An overview of your groups, lessons and homework is coming soon.</p></section>;
}
