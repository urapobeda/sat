import type { LucideIcon } from "lucide-react";
import type { SectionFilter } from "@/lib/questions";

type SectionTabsProps = {
  activeTab: SectionFilter;
  onChange: (tab: SectionFilter) => void;
  tabs: Array<{
    icon: LucideIcon;
    key: SectionFilter;
    label: string;
    questions: string;
  }>;
};

export function SectionTabs({ activeTab, onChange, tabs }: SectionTabsProps) {
  return (
    <div className="grid border-b border-slate-200 md:grid-cols-3">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <button
            className={[
              "relative flex items-center gap-4 px-5 py-5 text-left transition hover:bg-blue-50/50",
              isActive
                ? "bg-blue-50/40 text-blue-600 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-blue-600"
                : "text-slate-700"
            ].join(" ")}
            key={tab.key}
            onClick={() => onChange(tab.key)}
            type="button"
          >
            <span
              className={[
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                isActive ? "bg-white text-blue-600" : "bg-slate-100 text-slate-500"
              ].join(" ")}
            >
              <Icon size={23} />
            </span>
            <span>
              <span className="block text-sm font-black">{tab.label}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">
                {tab.questions}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
