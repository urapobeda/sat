import { FileSpreadsheet, FileText, Presentation } from "lucide-react";
import { materials, type MaterialRow } from "@/components/dashboard/materialsData";
import { StudentShell } from "@/components/dashboard/StudentShell";

const typeIcon: Record<MaterialRow["type"], typeof FileText> = {
  PDF: FileText,
  Slides: Presentation,
  Worksheet: FileSpreadsheet
};

export function MaterialsPage() {
  const mathCount = materials.filter((item) => item.section === "Math").length;
  const readingWritingCount = materials.filter(
    (item) => item.section === "Reading & Writing"
  ).length;

  const summaryStats = [
    { label: "Total Materials", value: String(materials.length) },
    { label: "Math", value: String(mathCount) },
    { label: "Reading & Writing", value: String(readingWritingCount) },
    { label: "Most Recent", value: materials[0]?.uploadedDate ?? "—" }
  ];

  return (
    <StudentShell active="materials" title="Student — Materials">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Materials</h1>
          <p className="mt-1 text-sm text-slate-600">
            Resources shared by your teacher.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {summaryStats.map((stat) => (
            <div
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              key={stat.label}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {stat.label}
              </p>
              <p className="mt-0.5 truncate text-lg font-black text-slate-950">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <ul className="divide-y divide-slate-100">
            {materials.map((material) => {
              const Icon = typeIcon[material.type];

              return (
                <li
                  className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  key={material.title}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon size={18} />
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{material.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {material.type} · {material.section} · Uploaded{" "}
                        {material.uploadedDate}
                      </p>
                    </div>
                  </div>
                  <button
                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-50 sm:w-auto"
                    type="button"
                  >
                    Download
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </StudentShell>
  );
}
