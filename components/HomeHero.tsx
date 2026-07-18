import { ArrowRight, Check, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { Button } from "@/components/Button";
import { ProgressCard } from "@/components/ProgressCard";

const trustItems = [
  { label: "Personalized Practice", tone: "bg-blue-600" },
  { label: "Detailed Explanations", tone: "bg-violet-600" },
  { label: "Track Your Progress", tone: "bg-emerald-500" }
];

const quickStats = [
  { value: "500+", label: "SAT-style questions" },
  { value: "10+", label: "mini tests" },
  { value: "Smart", label: "score tracking" }
];

export function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-white px-5 py-8 shadow-soft sm:px-8 sm:py-9 lg:px-12 lg:py-10">
      <DecorativeStars />

      <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
            Ace the <span className="text-blue-600">SAT.</span>
            <br />
            Reach Your Dream.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Practice smarter with SAT-style questions, realistic tests, and
            detailed progress tracking.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              className="min-h-[52px] w-full rounded-xl px-7 text-base sm:w-auto"
              href="/question-bank"
              icon={<ArrowRight size={20} />}
            >
              Start Practicing
            </Button>
            <Button
              className="min-h-[52px] w-full rounded-xl px-7 text-base sm:w-auto"
              href="/tests"
              icon={<Clock3 size={20} />}
              variant="secondary"
            >
              Take a Practice Test
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {quickStats.map((stat) => (
              <div
                className="rounded-2xl border border-blue-100 bg-white/80 px-4 py-3 shadow-sm"
                key={stat.label}
              >
                <p className="text-lg font-black text-slate-950">{stat.value}</p>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {trustItems.map((item) => (
              <div
                className="flex items-center gap-3 text-sm font-semibold text-slate-800"
                key={item.label}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${item.tone}`}
                >
                  <Check size={16} />
                </span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <ProgressCard />
        </div>
      </div>
    </section>
  );
}

function DecorativeStars() {
  return (
    <>
      <Sparkles
        className="absolute left-[46%] top-20 hidden text-blue-500 sm:block"
        size={22}
      />
      <Sparkles className="absolute right-10 top-20 text-blue-400" size={24} />
      <Sparkles
        className="absolute left-[44%] top-56 hidden text-blue-400 lg:block"
        size={28}
      />
      <CheckCircle2
        className="absolute right-[7%] top-52 hidden text-blue-200 lg:block"
        size={18}
      />
    </>
  );
}
