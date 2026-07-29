"use client";

import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  RotateCcw,
  Search,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AITutorPanel } from "@/components/ai-tutor/AITutorPanel";
import { EmptyState } from "@/components/EmptyState";
import { Layout } from "@/components/Layout";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ResultsCard } from "@/components/quiz/ResultsCard";
import { Timer, formatTime } from "@/components/quiz/Timer";
import { getQuestionSubtopic } from "@/lib/questionBankStructure";
import {
  formatSection,
  normalizeTopic,
  getWeakTopics
} from "@/lib/questions";
import {
  createPracticeSession,
  getCurrentUser,
  getQuestions
} from "@/lib/supabase/queries";
import { getSupabaseAuthHeaders } from "@/lib/supabase/authHeaders";
import type { User } from "@supabase/supabase-js";
import type {
  DifficultyFilter,
  Question,
  QuestionFeedback,
  SectionFilter
} from "@/types/sat";

export function QuestionBankPracticePage() {
  const searchParams = useSearchParams();
  const section = parseSection(searchParams.get("section"));
  const difficulty = parseDifficulty(searchParams.get("difficulty"));
  const topic = searchParams.get("topic");
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, QuestionFeedback>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(null);
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [reviewQuestion, setReviewQuestion] = useState<Question | null>(null);
  const hasSaved = useRef(false);

  const currentQuestion = practiceQuestions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] ?? null : null;
  const score = Object.values(feedback).filter((item) => item.isCorrect).length;
  const percentage =
    practiceQuestions.length > 0
      ? Math.round((score / practiceQuestions.length) * 100)
      : 0;
  const weakTopics = getWeakTopics(practiceQuestions, feedback);
  const displayTopic = practiceQuestions[0]?.topic ?? topic;

  useEffect(() => {
    let isMounted = true;

    async function loadPractice() {
      setIsLoading(true);
      setError(null);
      setPersistenceMessage(null);
      setPracticeQuestions([]);
      setAnswers({});
      setFeedback({});
      setCurrentIndex(0);
      setIsFinished(false);
      setElapsedSeconds(0);
      setSessionId(null);
      setIsTutorOpen(false);
      setReviewQuestion(null);
      hasSaved.current = false;

      try {
        const [loadedQuestions, user] = await Promise.all([
          loadQuestionsForPractice({ difficulty, section, topic }),
          getCurrentUser().catch(() => null)
        ]);

        if (!isMounted) {
          return;
        }

        setPracticeQuestions(loadedQuestions);
        setCurrentUser(user);

        if (!user) {
          setPersistenceMessage("Guest mode: sign in to save this practice session.");
          return;
        }

        if (loadedQuestions.length > 0) {
          await createSession(user, loadedQuestions);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load practice questions."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    async function createSession(user: User, loadedQuestions: Question[]) {
      try {
        const session = await createPracticeSession({
          difficulty: difficulty === "all" ? null : difficulty,
          section: section === "all" ? null : section,
          topic: loadedQuestions[0]?.topic ?? topic,
          total: loadedQuestions.length,
          user_id: user.id
        });

        if (isMounted) {
          setSessionId(session.id);
        }
      } catch {
        if (isMounted) {
          setPersistenceMessage(
            "Practice is available, but this session could not be saved."
          );
        }
      }
    }

    loadPractice();

    return () => {
      isMounted = false;
    };
  }, [difficulty, section, topic]);

  useEffect(() => {
    if (isLoading || isFinished || practiceQuestions.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isFinished, isLoading, practiceQuestions.length]);

  async function handleSelect(choice: string) {
    if (!currentQuestion || answers[currentQuestion.id]) {
      return;
    }

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [currentQuestion.id]: choice
    }));

    try {
      const authHeaders = currentUser ? await getSupabaseAuthHeaders() : {};
      const response = await fetch("/api/practice/answers", {
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedAnswer: choice,
          sessionId
        }),
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Unable to verify answer.");
      }

      const verifiedFeedback = (await response.json()) as QuestionFeedback;
      setFeedback((currentFeedback) => ({
        ...currentFeedback,
        [currentQuestion.id]: verifiedFeedback
      }));
    } catch {
      setPersistenceMessage("Answer selected, but feedback could not be verified.");
    }
  }

  async function handleNext() {
    if (currentIndex === practiceQuestions.length - 1) {
      finishPractice();
      return;
    }

    setCurrentIndex((index) => Math.min(index + 1, practiceQuestions.length - 1));
  }

  function handlePrevious() {
    setCurrentIndex((index) => Math.max(index - 1, 0));
  }

  async function finishPractice() {
    if (hasSaved.current) {
      setIsFinished(true);
      return;
    }

    hasSaved.current = true;
    setIsSavingResult(true);

    try {
      if (sessionId) {
        const authHeaders = currentUser ? await getSupabaseAuthHeaders() : {};
        const response = await fetch(`/api/practice/sessions/${sessionId}/complete`, {
          headers: authHeaders,
          method: "POST"
        });

        if (!response.ok) {
          throw new Error("Unable to complete practice session.");
        }
      }
    } catch {
      setPersistenceMessage("Results are shown here, but Supabase did not save them.");
    } finally {
      setIsSavingResult(false);
      setIsFinished(true);
    }
  }

  async function restartPractice() {
    setAnswers({});
    setFeedback({});
    setCurrentIndex(0);
    setIsFinished(false);
    setElapsedSeconds(0);
      hasSaved.current = false;
      setIsTutorOpen(false);
      setReviewQuestion(null);

    if (!currentUser || practiceQuestions.length === 0) {
      return;
    }

    try {
      const session = await createPracticeSession({
        difficulty: difficulty === "all" ? null : difficulty,
        section: section === "all" ? null : section,
        topic: practiceQuestions[0]?.topic ?? topic,
        total: practiceQuestions.length,
        user_id: currentUser.id
      });
      setSessionId(session.id);
    } catch {
      setPersistenceMessage("Practice restarted, but the new session was not saved.");
    }
  }

  return (
    <Layout>
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-white p-6 shadow-soft sm:p-8">
        <Link
          className="inline-flex items-center gap-2 text-sm font-black text-blue-600 transition hover:text-blue-700"
          href="/question-bank"
        >
          <ArrowLeft size={17} />
          Back to Question Bank
        </Link>
        <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
          Practice Mode
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
          {formatSection(section)}
          {displayTopic ? ` / ${displayTopic}` : ""} practice with instant
          explanations.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Timer seconds={elapsedSeconds} />
          {persistenceMessage ? (
            <p className="inline-flex rounded-2xl border border-blue-100 bg-white/80 px-4 py-2 text-sm font-bold text-slate-600">
              {persistenceMessage}
            </p>
          ) : null}
        </div>
      </section>

      {isLoading ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-black text-blue-600">
            <Loader2 className="animate-spin" size={20} />
            Loading practice questions from Supabase...
          </div>
          <div className="mt-6 space-y-4">
            {[0, 1, 2].map((item) => (
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" key={item} />
            ))}
          </div>
        </section>
      ) : error ? (
        <EmptyState
          description={error}
          icon={<Search size={26} />}
          title="Practice is unavailable"
        />
      ) : practiceQuestions.length === 0 ? (
        <EmptyState
          description="No questions match these filters. Go back and choose another section or topic."
          icon={<Search size={26} />}
          title="No questions found"
        />
      ) : isFinished ? (
        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <ResultsCard
              correctLabel={`${score} / ${practiceQuestions.length - score}`}
              onRestart={restartPractice}
              percentage={percentage}
              score={score}
              timeLabel={formatTime(elapsedSeconds)}
              total={practiceQuestions.length}
              weakTopics={weakTopics}
            />
            <article className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-violet-50/60 p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.12em] text-blue-600">
                    AI Review
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Review this session with AI
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Ask the tutor to explain a missed question or reinforce the
                    concept behind a correct one.
                  </p>
                </div>
                <button
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                  onClick={() => {
                    const missedQuestion =
                      practiceQuestions.find(
                        (question) => feedback[question.id]?.isCorrect === false
                      ) ?? practiceQuestions[0];
                    setReviewQuestion(missedQuestion);
                  }}
                  type="button"
                >
                  <Sparkles size={18} />
                  Review with AI
                </button>
              </div>
            </article>
          </div>
          {reviewQuestion ? (
            <AITutorPanel
              hasSubmittedOverride
              isOpen={Boolean(reviewQuestion)}
              key={reviewQuestion.id}
              onClose={() => setReviewQuestion(null)}
              question={reviewQuestion}
              selectedAnswer={answers[reviewQuestion.id] ?? null}
            />
          ) : null}
        </section>
      ) : currentQuestion ? (
        <section
          className={[
            "mt-6 grid gap-6",
            isTutorOpen ? "lg:grid-cols-[minmax(0,1fr)_420px]" : ""
          ].join(" ")}
        >
          <div className="space-y-5">
            <div className="flex justify-end">
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl"
                onClick={() => setIsTutorOpen(true)}
                type="button"
              >
                <Sparkles size={18} />
                Ask AI Tutor
              </button>
            </div>

            <QuestionCard
              currentIndex={currentIndex}
              onSelect={handleSelect}
              feedback={currentQuestion ? feedback[currentQuestion.id] : null}
              question={currentQuestion}
              selectedAnswer={selectedAnswer}
              showFeedback={Boolean(currentQuestion && feedback[currentQuestion.id])}
              totalQuestions={practiceQuestions.length}
            />

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-5 py-3 text-sm font-black text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={currentIndex === 0}
                onClick={handlePrevious}
                type="button"
              >
                <ArrowLeft size={18} />
                Previous
              </button>

              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                onClick={restartPractice}
                type="button"
              >
                <RotateCcw size={17} />
                Restart
              </button>

              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none sm:justify-self-end"
                disabled={!selectedAnswer || isSavingResult}
                onClick={handleNext}
                type="button"
              >
                {isSavingResult ? <Loader2 className="animate-spin" size={18} /> : null}
                {currentIndex === practiceQuestions.length - 1
                  ? "Show Results"
                  : "Next"}
                {!isSavingResult ? <ArrowRight size={18} /> : null}
              </button>
            </div>
          </div>
          {isTutorOpen ? (
            <AITutorPanel
              isOpen={isTutorOpen}
              key={currentQuestion.id}
              onClose={() => setIsTutorOpen(false)}
              question={currentQuestion}
              selectedAnswer={selectedAnswer}
            />
          ) : null}
        </section>
      ) : null}
    </Layout>
  );
}

function parseSection(value: string | null): SectionFilter {
  return value === "math" || value === "reading-writing" ? value : "all";
}

function parseDifficulty(value: string | null): DifficultyFilter {
  return value === "easy" || value === "medium" || value === "hard"
    ? value
    : "all";
}

async function loadQuestionsForPractice({
  difficulty,
  section,
  topic
}: {
  difficulty: DifficultyFilter;
  section: SectionFilter;
  topic: string | null;
}) {
  if (!topic) {
    return getQuestions({ difficulty, section });
  }

  const loadedQuestions = await getQuestions({ difficulty, section, topic });

  if (loadedQuestions.length > 0) {
    return loadedQuestions;
  }

  const normalizedTopic = normalizeTopic(topic);
  const sectionQuestions = await getQuestions({ difficulty, section });

  return sectionQuestions.filter(
    (question) =>
      normalizeTopic(question.topic) === normalizedTopic ||
      normalizeTopic(getQuestionSubtopic(question)) === normalizedTopic
  );
}
