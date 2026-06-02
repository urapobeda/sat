import {
  BookOpen,
  Calculator,
  Clock3,
  ListChecks,
  type LucideIcon
} from "lucide-react";

const infoItems: Array<{
  description: string;
  icon: LucideIcon;
  label: string;
  tone: string;
}> = [
  {
    description:
      "Reading & Writing, Math No Calculator, Math Calculator, Essay Optional",
    icon: BookOpen,
    label: "4 Sections",
    tone: "bg-blue-600 text-white"
  },
  {
    description: "Total across all sections",
    icon: ListChecks,
    label: "154 Questions",
    tone: "bg-emerald-500 text-white"
  },
  {
    description: "Total time, breaks not included",
    icon: Clock3,
    label: "3h 14m",
    tone: "bg-violet-500 text-white"
  },
  {
    description: "400-1600 SAT Score",
    icon: Calculator,
    label: "Scoring",
    tone: "bg-orange-500 text-white"
  }
];

export function TestInformationCard() {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-black text-slate-950">Test Information</h2>

      <div className="mt-5 space-y-5">
        {infoItems.map((item) => {
          const Icon = item.icon;

          return (
            <div className="flex items-start gap-4" key={item.label}>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.tone}`}
              >
                <Icon size={17} />
              </span>
              <div>
                <p className="font-black text-slate-950">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
