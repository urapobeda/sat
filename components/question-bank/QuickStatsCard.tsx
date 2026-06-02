import { Clock3, FileText, Flame, Grid2X2, type LucideIcon } from "lucide-react";

type QuickStatsCardProps = {
  totalQuestions: number;
  totalTopics: number;
};

export function QuickStatsCard({
  totalQuestions,
  totalTopics
}: QuickStatsCardProps) {
  const quickStats: Array<{
    icon: LucideIcon;
    label: string;
    tone: string;
    value: string;
  }> = [
    {
      icon: FileText,
      label: "Total Questions",
      tone: "text-blue-600",
      value: totalQuestions.toLocaleString()
    },
    {
      icon: Grid2X2,
      label: "Topics",
      tone: "text-blue-600",
      value: String(totalTopics)
    },
    {
      icon: Clock3,
      label: "Time Practiced",
      tone: "text-orange-600",
      value: "12h 45m"
    },
    {
      icon: Flame,
      label: "Day Streak",
      tone: "text-rose-600",
      value: "7"
    }
  ];

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
              <Icon className={stat.tone} size={24} />
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
