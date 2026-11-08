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
import { useEffect, useMemo, useRef, useState } from "react";
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
  getQuestionCatalog,
  getQuestionDetails
} from "@/lib/supabase/queries";
import { getSupabaseAuthHeaders } from "@/lib/supabase/authHeaders";
import { QuestionStopwatch } from "@/lib/practiceTiming";
import type { User } from "@supabase/supabase-js";
import type {
  DifficultyFilter,
  Question,
  QuestionSummary,
  QuestionFeedback,
  SectionFilter
} from "@/types/sat";

export function QuestionBankPracticePage() {
  const searchParams = useSearchParams();
  const section = parseSection(searchParams.get("section"));
  const difficulty = parseDifficulty(searchParams.get("difficulty"));
  const topic = searchParams.get("topic");
  const topicsParam = searchParams.get("topics");
  const topics = useMemo(
    () => (topicsParam ? topicsParam.split(",").filter(Boolean) : []),
    [topicsParam]
  );
  const [practiceQuestions, setPracticeQuestions] = useState<QuestionSummary[]>([]);
  const [questionDetails, setQuestionDetails] = useState<Record<string, Question>>({});
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
  const questionClocks = useRef(new Map<string, QuestionStopwatch>());
  const submissionPending = useRef(false);
  const [isChecking, setIsChecking] = useState(false);
  const [timerRun, setTimerRun] = useState(0);
  const [submittedSeconds, setSubmittedSeconds] = useState<Record<string, number>>({});
  const [questionTick, setQuestionTick] = useState<{ id: string | null; seconds: number }>({ id: null, seconds: 0 });

  const currentQuestion = questionDetails[practiceQuestions[currentIndex]?.id];
  const questionSeconds = currentQuestion ? submittedSeconds[currentQuestion.id] ?? (questionTick.id === currentQuestion.id ? questionTick.seconds : 0) : 0;
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] ?? null : null;
  const score = Object.values(feedback).filter((item) => item.isCorrect).length;
  const percentage =
    practiceQuestions.length > 0
      ? Math.round((score / practiceQuestions.length) * 100)
      : 0;
  const weakTopics = getWeakTopics(practiceQuestions, feedback);
  const displayTopic = practiceQuestions[0]?.topic ?? topic;

  useEffect(() => {
    if (!currentQuestion || isLoading || isFinished) return;
    const id = currentQuestion.id;
    const clock = questionClocks.current.get(id) ?? new QuestionStopwatch();
    questionClocks.current.set(id, clock);
    const update = () => {
      const seconds = clock.seconds(performance.now());
      setQuestionTick((previous) => previous.id === id && previous.seconds === seconds ? previous : { id, seconds });
    };
    clock.start(performance.now());
    const interval = window.setInterval(update, 250);
    return () => {
      window.clearInterval(interval);
      clock.pause(performance.now());
    };
  }, [currentQuestion, isLoading, isFinished, timerRun]);

  useEffect(() => {
    let isMounted = true;

    async function loadPractice() {
      setIsLoading(true);
      setError(null);
      setPersistenceMessage(null);
      setPracticeQuestions([]);
      setQuestionDetails({});
      setAnswers({});
      setFeedback({});
      setCurrentIndex(0);
      setIsFinished(false);
      setElapsedSeconds(0);
      setSessionId(null);
      setIsTutorOpen(false);
      setReviewQuestion(null);
      questionClocks.current.clear();
      setTimerRun((run) => run + 1);
      setSubmittedSeconds({});
      setQuestionTick({ id: null, seconds: 0 });
      setIsChecking(false);
      submissionPending.current = false;
      hasSaved.current = false;

      try {
        const [loadedQuestions, user] = await Promise.all([
          loadQuestionsForPractice({ difficulty, section, topic, topics }).then(async (catalog) => {
            const firstQuestions = await getQuestionDetails(catalog.slice(0, 5).map((q) => q.id));
            return { catalog, firstQuestions };
          }),
          getCurrentUser().catch(() => null)
        ]);

        if (!isMounted) {
          return;
        }

        setPracticeQuestions(loadedQuestions.catalog);
        setQuestionDetails(Object.fromEntries(loadedQuestions.firstQuestions.map((q) => [q.id, q])));
        setCurrentUser(user);

        if (!user) {
          setPersistenceMessage("Guest mode: sign in to save this practice session.");
          return;
        }

        if (loadedQuestions.catalog.length > 0) {
          await createSession(user, loadedQuestions.catalog);
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

    async function createSession(user: User, loadedQuestions: QuestionSummary[]) {
      try {
        const session = await createPracticeSession({
          difficulty: difficulty === "all" ? null : difficulty,
          section: section === "all" ? null : section,
          topic: topics.length > 0 ? null : loadedQuestions[0]?.topic ?? topic,
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
  }, [difficulty, section, topic, topics]);

  // Keep the next questions ready while the student works on the current one.
  useEffect(() => {
    let active = true;
    const currentId = practiceQuestions[currentIndex]?.id;
    const batchStart = Math.floor(currentIndex / 5) * 5;
    const missing = practiceQuestions.slice(batchStart, batchStart + 10)
      .filter((q) => !questionDetails[q.id]).map((q) => q.id);
    if (!missing.length) return;
    const needsCurrent = currentId && !questionDetails[currentId];
    void getQuestionDetails(missing).then((loaded) => {
      if (active) setQuestionDetails((previous) => ({ ...previous, ...Object.fromEntries(loaded.map((q) => [q.id, q])) }));
    }).catch((error) => {
      if (active && needsCurrent) setError(error instanceof Error ? error.message : "Unable to load this question.");
    });
    return () => { active = false; };
  }, [practiceQuestions, currentIndex, questionDetails]);

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
    if (!currentQuestion || answers[currentQuestion.id] || submissionPending.current) {
      return;
    }
    const question = currentQuestion;
    submissionPending.current = true;
    setIsChecking(true);
    const clock = questionClocks.current.get(question.id) ?? new QuestionStopwatch();
    questionClocks.current.set(question.id, clock);
    const timeSpentSeconds = clock.submit(performance.now());
    setSubmittedSeconds((previous) => ({ ...previous, [question.id]: timeSpentSeconds }));

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
          sessionId,
          timeSpentSeconds
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
      if (currentUser && !verifiedFeedback.answerSaved) {
        setPersistenceMessage("Answer checked, but your result could not be saved.");
      } else if (currentUser && verifiedFeedback.isCorrect && !verifiedFeedback.timingRecorded) {
        setPersistenceMessage("Answer saved, but its timing could not be saved.");
      }
    } catch {
      clock.retry(performance.now(), true);
      setAnswers((previous) => { const next = { ...previous }; delete next[question.id]; return next; });
      setSubmittedSeconds((previous) => { const next = { ...previous }; delete next[question.id]; return next; });
      setPersistenceMessage("The answer could not be checked. Please try again; your question timer has resumed.");
    } finally {
      submissionPending.current = false;
      setIsChecking(false);
    }
  }

  async function handleNext() {
    if (currentIndex === practiceQuestions.length - 1) {
      finishPractice();
      return;
    }

    showQuestionAt(Math.min(currentIndex + 1, practiceQuestions.length - 1));
  }

  function handlePrevious() {
    showQuestionAt(Math.max(currentIndex - 1, 0));
  }

  function showQuestionAt(index: number) {
    const id = practiceQuestions[index]?.id ?? null;
    setQuestionTick({ id, seconds: id ? questionClocks.current.get(id)?.seconds(performance.now()) ?? 0 : 0 });
    setCurrentIndex(index);
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
    questionClocks.current.clear();
    setTimerRun((run) => run + 1);
    setSubmittedSeconds({});
    setQuestionTick({ id: null, seconds: 0 });
    hasSaved.current = false;
    setIsTutorOpen(false);
    setReviewQuestion(null);
    setSessionId(null);

    if (!currentUser || practiceQuestions.length === 0) {
      return;
    }

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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
          <Timer label="Session" seconds={elapsedSeconds} />
          {persistenceMessage ? (
            <p className="inline-flex rounded-2xl border border-blue-100 bg-white/80 px-4 py-2 text-sm font-bold text-slate-600">
              {persistenceMessage}
            </p>
          ) : null}
        </div>
      </section>

      {isLoading || (!error && !isFinished && practiceQuestions.length > 0 && !currentQuestion) ? (
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
                    setReviewQuestion(questionDetails[missedQuestion.id] ?? null);
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
              timerSeconds={questionSeconds}
            />

            {feedback[currentQuestion.id] ? (
              <p className="text-sm text-slate-600">
                {feedback[currentQuestion.id].isCorrect
                  ? `Correct answer time: ${formatTime(questionSeconds)}${feedback[currentQuestion.id].timingRecorded ? " · saved to your timing statistics." : "."}`
                  : "Time not counted: incorrect answers are excluded from timing statistics."}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-5 py-3 text-sm font-black text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={currentIndex === 0 || isChecking}
                onClick={handlePrevious}
                type="button"
              >
                <ArrowLeft size={18} />
                Previous
              </button>

              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                onClick={restartPractice}
                disabled={isChecking}
                type="button"
              >
                <RotateCcw size={17} />
                Restart
              </button>

              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none sm:justify-self-end"
                disabled={!selectedAnswer || !feedback[currentQuestion.id] || isChecking || isSavingResult}
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
  topic,
  topics
}: {
  difficulty: DifficultyFilter;
  section: SectionFilter;
  topic: string | null;
  topics: string[];
}) {
  const sectionQuestions = (await getQuestionCatalog()).filter((q) =>
    (section === "all" || q.section === section) &&
    (difficulty === "all" || q.difficulty === difficulty));
  if (topics.length > 0) {
    const normalizedTopics = new Set(topics.map((item) => normalizeTopic(item)));

    return sectionQuestions.filter(
      (question) =>
        normalizedTopics.has(normalizeTopic(question.topic)) ||
        normalizedTopics.has(normalizeTopic(getQuestionSubtopic(question)))
    );
  }

  if (!topic) {
    return sectionQuestions;
  }

  const loadedQuestions = sectionQuestions.filter((q) => normalizeTopic(q.topic) === normalizeTopic(topic));

  if (loadedQuestions.length > 0) {
    return loadedQuestions;
  }

  const normalizedTopic = normalizeTopic(topic);

  return sectionQuestions.filter(
    (question) =>
      normalizeTopic(question.topic) === normalizedTopic ||
      normalizeTopic(getQuestionSubtopic(question)) === normalizedTopic
  );
}
