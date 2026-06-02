import { weakAreas } from "@/components/question-bank/mockData";

export function WeakAreasCard() {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">Weak Areas</h2>

      <div className="mt-5 space-y-5">
        {weakAreas.map((area) => (
          <div key={area.title}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950">{area.title}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {area.section}
                </p>
              </div>
              <span className="text-sm font-black text-slate-700">
                {area.mastery}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${area.tone}`}
                style={{ width: `${area.mastery}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
