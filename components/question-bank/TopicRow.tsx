import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { normalizeTopic, type TopicSummary } from "@/lib/questions";

type TopicRowProps = {
  topic: TopicSummary;
};

export function TopicRow({ topic }: TopicRowProps) {
  const isMath = topic.section === "math";
  const barTone =
    topic.mastery < 50
      ? "bg-orange-500"
      : topic.mastery < 60
        ? "bg-yellow-500"
        : "bg-emerald-500";

  return (
    <div className="grid gap-4 border-b border-slate-100 px-1 py-4 transition last:border-b-0 hover:bg-slate-50 md:grid-cols-[1.5fr_0.55fr_0.45fr_0.75fr_auto] md:items-center md:px-4">
      <div>
        <h4 className="font-black text-slate-950">{topic.title}</h4>
        <p className="mt-1 text-sm leading-5 text-slate-600">
          {topic.description}
        </p>
      </div>

      <div>
        <span
          className={[
            "inline-flex rounded-lg px-3 py-1 text-xs font-black",
            isMath ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"
          ].join(" ")}
        >
          {isMath ? "Math" : "Reading & Writing"}
        </span>
      </div>

      <p className="text-sm font-black text-slate-700">{topic.questions}</p>

      <div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-black text-slate-950">{topic.mastery}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${barTone}`}
            style={{ width: `${topic.mastery}%` }}
          />
        </div>
      </div>

      <Link
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 md:justify-self-end"
        href={`/question-bank/practice?section=${topic.section}&topic=${normalizeTopic(topic.title)}`}
      >
        Practice
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
