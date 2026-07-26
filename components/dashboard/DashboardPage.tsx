import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  Clock3,
  FileText,
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
import { MistakeReviewCard } from "@/components/MistakeReviewCard";
import { SATCountdown } from "@/components/SATCountdown";
import { SectionCard } from "@/components/SectionCard";
import { StudyPlanCard } from "@/components/StudyPlanCard";
import { UserDashboard } from "@/components/UserDashboard";

const featureCards = [
  {
    title: "Practice Questions",
    description: "Targeted Math and Reading & Writing drills with explanations",
    icon: ClipboardList,
    tone: "from-blue-500 to-blue-700",
    cta: "Start practice",
    href: "/question-bank"
  },
  {
    title: "Full-Length Tests",
    description: "Timed SAT tests with scoring and post-test review",
    icon: Clock3,
    tone: "from-violet-500 to-purple-700",
    cta: "Open tests",
    href: "/tests"
  },
  {
    title: "Past Papers",
    description: "Browse complete demo papers and sectional practice exams",
    icon: FileText,
    tone: "from-cyan-500 to-blue-600",
    cta: "Browse papers",
    href: "/past-papers"
  },
  {
    title: "Track Progress",
    description: "Follow score trends, accuracy, and completed sessions",
    icon: TrendingUp,
    tone: "from-emerald-400 to-teal-600",
    cta: "View analytics",
    href: "/progress"
  },
  {
    title: "Smart Learning",
    description: "Spot weak skills and choose the next best practice set",
    icon: Lightbulb,
    tone: "from-amber-400 to-orange-500",
    cta: "See recommendations",
    href: "/study-plan"
  }
];

const sections = [
  {
    title: "Math",
    description: "Algebra, Advanced Math, Problem Solving and Data Analysis",
    icon: SquareRadical,
    questions: "Questions load from Supabase",
    tone: "from-blue-500 to-blue-700",
    panel: "border-blue-100 bg-blue-50/70",
    topics: ["Algebra", "Advanced Math", "Data Analysis"],
    cta: "Practice Math",
    href: "/question-bank?section=math"
  },
  {
    title: "Reading & Writing",
    description: "Grammar, Vocabulary, and Reading Comprehension",
    icon: BookOpen,
    questions: "Questions load from Supabase",
    tone: "from-violet-500 to-purple-700",
    panel: "border-violet-100 bg-violet-50/70",
    topics: ["Grammar", "Transitions", "Reading"],
    cta: "Practice Reading",
    href: "/question-bank?section=reading-writing"
  }
];

export function DashboardPage() {
  return (
    <Layout>
      <HomeHero />

      <UserDashboard />

      <section className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <StudyPlanCard />
        <SATCountdown />
      </section>

      <section className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {featureCards.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </section>

      <section className="mt-9">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              Continue Studying
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Jump back into the SAT area that needs the most attention today.
            </p>
          </div>
          <Button
            className="w-full rounded-xl sm:w-auto"
            href="/past-papers"
            icon={<ArrowRight size={18} />}
            variant="secondary"
          >
            Browse Past Papers
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {sections.map((section) => (
            <SectionCard key={section.title} {...section} />
          ))}
        </div>
      </section>

      <MistakeReviewCard />

      <section className="mt-7 rounded-3xl border border-blue-100 bg-blue-50/80 p-6 shadow-sm sm:p-8">
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
