import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  Clock3,
  Lightbulb,
  Quote,
  SquareRadical,
  Trophy,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/Button";
import { FeatureCard } from "@/components/FeatureCard";
import { HomeHero } from "@/components/HomeHero";
import { Layout } from "@/components/Layout";
import { SectionCard } from "@/components/SectionCard";

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
      <HomeHero />

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {featureCards.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </section>

      <section className="mt-10">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-black text-slate-950">
            Practice by Section
          </h2>
          <Button
            className="w-full rounded-xl sm:w-auto"
            href="/practice"
            icon={<ArrowRight size={18} />}
            variant="secondary"
          >
            View All Sections
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {sections.map((section) => (
            <SectionCard key={section.title} {...section} />
          ))}
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
