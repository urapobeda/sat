import { Bookmark, CheckCircle2, Flame, PieChart, type LucideIcon } from "lucide-react";

type AnalyticsStat = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export function QuestionAnalyticsRow({
  accuracyPercent,
  attempted,
  saved,
  streak
}: {
  accuracyPercent: number | null;
  attempted: number;
  saved: number;
  streak: number;
}) {
  const stats: AnalyticsStat[] = [
    {
      icon: CheckCircle2,
      label: "Questions Attempted",
      value: attempted.toLocaleString()
    },
    {
      icon: PieChart,
      label: "Current Accuracy",
      value: accuracyPercent === null ? "—" : `${accuracyPercent}%`
    },
    {
      icon: Bookmark,
      label: "Saved Questions",
      value: saved.toLocaleString()
    },
    {
      icon: Flame,
      label: "Study Streak",
      value: String(streak)
    }
  ];

  return (
    <div className="grid gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-slate-100">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div className="relative overflow-hidden p-5" key={stat.label}>
            <Icon
              className="pointer-events-none absolute -bottom-3 -right-3 text-slate-50"
              size={72}
            />
            <div className="relative">
              <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{stat.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
