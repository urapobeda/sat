import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Lightbulb,
  Quote,
  Sparkles,
  SquareRadical,
  Target,
  Trophy,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Layout } from "@/components/Layout";

const featureCards = [
  {
    title: "Practice Questions",
    description: "Thousands of SAT-style questions with explanations",
    icon: ClipboardList,
    tone: "from-blue-500 to-blue-700"
  },
  {
    title: "Full-Length Tests",
    description: "Realistic SAT tests with timer and scoring",
    icon: Clock3,
    tone: "from-violet-500 to-purple-700"
  },
  {
    title: "Track Progress",
    description: "Monitor your improvement and performance",
    icon: TrendingUp,
    tone: "from-emerald-400 to-teal-600"
  },
  {
    title: "Smart Learning",
    description: "Focus on your weak areas and improve faster",
    icon: Lightbulb,
    tone: "from-amber-400 to-orange-500"
  }
];

const trustItems = [
  { label: "Personalized Practice", tone: "bg-blue-600" },
  { label: "Detailed Explanations", tone: "bg-violet-600" },
  { label: "Track Your Progress", tone: "bg-emerald-500" }
];

const sections = [
  {
    title: "Math",
    description: "Algebra, Advanced Math, Problem Solving and Data Analysis",
    icon: SquareRadical,
    questions: "120+ Questions",
    tone: "from-blue-500 to-blue-700",
    panel: "border-blue-100 bg-blue-50/70"
  },
  {
    title: "Reading & Writing",
    description: "Reading Comprehension, Grammar, and Vocabulary",
    icon: BookOpen,
    questions: "150+ Questions",
    tone: "from-violet-500 to-purple-700",
    panel: "border-violet-100 bg-violet-50/70"
  }
];

export default function HomePage() {
  return (
    <Layout>
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
              <Button className="min-h-14 w-full rounded-xl px-7 text-base sm:w-auto" href="/practice" icon={<ArrowRight size={20} />}>
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
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-800" key={item.label}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${item.tone}`}>
                    <Check size={16} />
                  </span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <HeroVisual />
        </div>
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {featureCards.map((feature) => {
          const Icon = feature.icon;

          return (
            <Card className="group hover:-translate-y-1" key={feature.title}>
              <div className="flex items-center gap-5">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${feature.tone} text-white shadow-lg transition group-hover:scale-105`}>
                  <Icon size={26} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-950">
                    {feature.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="mt-10">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-black text-slate-950">Practice by Section</h2>
          <Button className="w-full rounded-xl sm:w-auto" href="/practice" icon={<ArrowRight size={18} />} variant="secondary">
            View All Sections
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <Card className={`group hover:-translate-y-1 ${section.panel}`} key={section.title}>
                <div className="flex items-center gap-5 sm:gap-7">
                  <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${section.tone} text-white shadow-xl transition group-hover:scale-105`}>
                    <Icon size={38} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-black text-slate-950">
                      {section.title}
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                      {section.description}
                    </p>
                    <p className="mt-4 text-sm font-bold text-slate-800">
                      {section.questions}
                    </p>
                  </div>
                  <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-md transition group-hover:translate-x-1 sm:flex">
                    <ArrowRight size={22} />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-9 rounded-2xl border border-blue-100 bg-blue-50/80 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <Quote className="shrink-0 text-blue-600" size={38} />
            <p className="text-xl font-semibold leading-8 text-slate-900">
              The best preparation today leads to a better tomorrow.
            </p>
          </div>
          <Trophy className="hidden shrink-0 text-blue-600 sm:block" size={54} />
        </div>
      </section>
    </Layout>
  );
}

function HeroVisual() {
  return (
    <div className="relative min-h-[430px] lg:min-h-[500px]">
      <div className="absolute left-2 top-20 hidden h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xl shadow-blue-600/25 sm:flex">
        <BarChart3 size={28} />
      </div>
      <div className="absolute right-8 top-24 hidden h-16 w-16 items-center justify-center rounded-xl bg-emerald-400 text-white shadow-xl shadow-emerald-400/25 sm:flex">
        <Target size={30} />
      </div>

      <div className="absolute left-[8%] right-[10%] top-10 rounded-3xl border border-white/80 bg-white/80 p-6 shadow-2xl shadow-blue-950/10 backdrop-blur sm:p-8 lg:left-[14%] lg:right-[16%] lg:top-8 lg:rotate-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-black text-slate-950">Your Progress</p>
            <p className="mt-6 text-sm font-semibold text-slate-600">Score</p>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-5xl font-black text-slate-950">750</span>
              <span className="pb-2 text-sm font-bold text-slate-500">/1600</span>
            </div>
            <p className="mt-2 text-sm font-bold text-emerald-600">+120 vs last week</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            This Week
          </span>
        </div>

        <div className="mt-8 h-28 rounded-2xl bg-gradient-to-b from-blue-50 to-white p-4">
          <div className="flex h-full items-end gap-3">
            {[35, 48, 62, 82, 50, 72, 68, 96].map((height, index) => (
              <div className="flex flex-1 items-end" key={height + index}>
                <span
                  className="w-full rounded-t-full bg-blue-600/80"
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <MiniScore label="Math" score="780" tone="bg-blue-600" />
          <MiniScore label="Reading & Writing" score="720" tone="bg-violet-600" />
        </div>
      </div>

      <div className="absolute bottom-0 right-2 w-48 sm:right-10 sm:w-60 lg:right-4">
        <div className="relative mx-auto h-24 w-32 rounded-[50%] bg-gradient-to-br from-violet-500 to-blue-600 shadow-2xl shadow-blue-800/20">
          <div className="absolute -top-8 left-1/2 h-16 w-44 -translate-x-1/2 rotate-3 rounded-xl bg-gradient-to-br from-violet-400 to-blue-600 shadow-xl" />
          <div className="absolute right-1 top-1 h-16 w-1 rounded-full bg-amber-300" />
          <div className="absolute right-0 top-14 h-8 w-3 rounded-full bg-amber-400" />
        </div>
        <div className="mt-1 h-7 rounded-lg bg-blue-200 shadow-lg" />
        <div className="mx-3 h-7 rounded-lg bg-white shadow-lg" />
        <div className="mx-1 h-7 rounded-lg bg-blue-700 shadow-lg" />
      </div>
    </div>
  );
}

type MiniScoreProps = {
  label: string;
  score: string;
  tone: string;
};

function MiniScore({ label, score, tone }: MiniScoreProps) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">
        {score}
        <span className="text-sm font-bold text-slate-500"> /800</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full w-4/5 rounded-full ${tone}`} />
      </div>
    </div>
  );
}

function DecorativeStars() {
  return (
    <>
      <Sparkles className="absolute left-[46%] top-20 hidden text-blue-500 sm:block" size={22} />
      <Sparkles className="absolute right-10 top-20 text-blue-400" size={24} />
      <Sparkles className="absolute left-[44%] top-56 hidden text-blue-400 lg:block" size={28} />
      <CheckCircle2 className="absolute right-[7%] top-52 hidden text-blue-200 lg:block" size={18} />
    </>
  );
}
