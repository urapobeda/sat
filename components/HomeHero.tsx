import { ArrowRight, Check, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { Button } from "@/components/Button";
import { ProgressCard } from "@/components/ProgressCard";

const trustItems = [
  { label: "Personalized Practice", tone: "bg-blue-600" },
  { label: "Detailed Explanations", tone: "bg-violet-600" },
  { label: "Track Your Progress", tone: "bg-emerald-500" }
];

export function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-[1.25rem] border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-white px-5 py-10 shadow-soft sm:px-8 lg:px-12 lg:py-14">
      <DecorativeStars />

      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-5xl font-black leading-tight tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
            Ace the <span className="text-blue-600">SAT.</span>
            <br />
            Reach Your Dream.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
            Practice smarter with SAT-style questions, realistic tests, and
            detailed progress tracking.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button
              className="min-h-14 w-full rounded-xl px-7 text-base sm:w-auto"
              href="/practice"
              icon={<ArrowRight size={20} />}
            >
              Start Practicing
            </Button>
            <Button
              className="min-h-14 w-full rounded-xl px-7 text-base sm:w-auto"
              href="/tests"
              icon={<Clock3 size={20} />}
              variant="secondary"
            >
              Take a Mini Test
            </Button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
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

        <ProgressCard />
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
