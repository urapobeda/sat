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
    <StudentShell active="materials">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Materials</h1>
          <p className="mt-2 text-base text-slate-600">
            Resources shared by your teacher.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {summaryStats.map((stat) => (
            <div
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
              key={stat.label}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {stat.label}
              </p>
              <p className="mt-1 truncate text-xl font-bold text-slate-950">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <ul className="divide-y divide-slate-100">
            {materials.map((material) => {
              const Icon = typeIcon[material.type];

              return (
                <li
                  className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
                  key={material.title}
                >
                  <div className="flex items-start gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon size={19} />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{material.title}</p>
                      <p className="mt-1.5 text-xs text-slate-500">
                        {material.type} · {material.section} · Uploaded{" "}
                        {material.uploadedDate}
                      </p>
                    </div>
                  </div>
                  <button
                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 sm:w-auto"
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
