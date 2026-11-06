import Link from "next/link";

export type HomeworkRow = {
  title: string;
  meta: string;
  due: string;
  dueTone: "today" | "default" | "done";
  progress?: { done: number; total: number };
  percent?: number;
  action: { label: string; href: string; variant: "primary" | "outline" | "link" };
};

export function HomeworkTable({ rows }: { rows: HomeworkRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="pb-3 pr-4 font-semibold">Assignment</th>
            <th className="pb-3 pr-4 font-semibold">Due</th>
            <th className="pb-3 pr-4 font-semibold">Progress</th>
            <th className="pb-3 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.title}>
              <td className="py-4 pr-4 align-top">
                <p className="font-semibold text-slate-900">{row.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{row.meta}</p>
              </td>
              <td className="py-4 pr-4 align-top">
                {row.dueTone === "today" ? (
                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    {row.due}
                  </span>
                ) : (
                  <span className="text-slate-600">{row.due}</span>
                )}
              </td>
              <td className="py-4 pr-4 align-top">
                {row.progress ? (
                  <div className="w-32">
                    <p className="text-xs font-semibold text-slate-700">
                      {row.progress.done} / {row.progress.total}
                      {row.percent ? ` · ${row.percent}%` : ""}
                    </p>
                    {row.dueTone !== "done" ? (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{
                            width: `${Math.round(
                              (row.progress.done / row.progress.total) * 100
                            )}%`
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-slate-400">Not started</span>
                )}
              </td>
              <td className="py-4 align-top">
                {row.action.variant === "primary" ? (
                  <Link
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold !text-white shadow-sm transition hover:bg-blue-700"
                    href={row.action.href}
                  >
                    {row.action.label}
                  </Link>
                ) : row.action.variant === "outline" ? (
                  <Link
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                    href={row.action.href}
                  >
                    {row.action.label}
                  </Link>
                ) : (
                  <Link
                    className="text-xs font-semibold text-blue-600 hover:underline"
                    href={row.action.href}
                  >
                    {row.action.label}
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
