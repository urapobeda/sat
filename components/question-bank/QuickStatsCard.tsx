import { quickStats } from "@/components/question-bank/mockData";

export function QuickStatsCard() {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">Quick Stats</h2>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {quickStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
              key={stat.label}
            >
              <Icon className={stat.tone.split(" ").at(-1)} size={24} />
              <p className="mt-3 text-lg font-black text-slate-950">
                {stat.value}
              </p>
              <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </article>
  );
}
