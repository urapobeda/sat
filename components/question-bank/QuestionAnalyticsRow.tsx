import { Bookmark, CheckCircle2, PieChart, type LucideIcon } from "lucide-react";

type AnalyticsStat = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export function QuestionAnalyticsRow({
  accuracyPercent,
  attempted,
  saved
}: {
  accuracyPercent: number | null;
  attempted: number;
  saved: number;
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
    }
  ];

  return (
    <div className="hub-card grid gap-2 overflow-hidden sm:grid-cols-3 sm:divide-x sm:divide-slate-100">
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
