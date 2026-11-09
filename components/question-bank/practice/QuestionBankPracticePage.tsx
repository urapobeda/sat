"use client";

import { Loader2, Search, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AITutorPanel } from "@/components/ai-tutor/AITutorPanel";
import { EmptyState } from "@/components/EmptyState";
import { PracticeExam } from "@/components/question-bank/practice/PracticeExam";
import { ResultsCard } from "@/components/quiz/ResultsCard";
import { formatTime } from "@/components/quiz/Timer";
import { filterQuestionCatalog, filterQuestionsByCompletion, parseQuestionCompletion, parseQuestionDifficulties } from "@/lib/questionBankFilters";
import { getWeakTopics } from "@/lib/questions";
import {
  createPracticeSession,
  getCurrentUser,
  getQuestionCatalog,
  getQuestionDetails,
  getQuestionProgressLookup
} from "@/lib/supabase/queries";
import { getSupabaseAuthHeaders } from "@/lib/supabase/authHeaders";
import { QuestionStopwatch } from "@/lib/practiceTiming";
import type { User } from "@supabase/supabase-js";
import type {
  Question,
  QuestionSummary,
  PracticeFeedback,
  SectionFilter
} from "@/types/sat";

export function QuestionBankPracticePage() {
  const searchParams = useSearchParams();
  const section = parseSection(searchParams.get("section"));
  const difficultyParam = searchParams.get("difficulties") ?? searchParams.get("difficulty");
  const difficulties = useMemo(() => parseQuestionDifficulties(difficultyParam), [difficultyParam]);
  const reviewMissed = searchParams.get("review") === "missed";
  const completion = parseQuestionCompletion(searchParams.get("completion"));
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
  const [feedback, setFeedback] = useState<Record<string, PracticeFeedback>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(null);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
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

  useEffect(() => {
    if (!currentQuestion || isLoading || isFinished || isTimerPaused) return;
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
  }, [currentQuestion, isLoading, isFinished, isTimerPaused, timerRun]);

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
      setIsTimerPaused(false);
      setReviewQuestion(null);
      questionClocks.current.clear();
      setTimerRun((run) => run + 1);
      setSubmittedSeconds({});
      setQuestionTick({ id: null, seconds: 0 });
      setIsChecking(false);
      submissionPending.current = false;
      hasSaved.current = false;

      try {
        const userRequest = getCurrentUser().catch(() => null);
        const progressRequest = completion === "all" && !reviewMissed
          ? Promise.resolve(null)
          : userRequest.then((user) => user ? getQuestionProgressLookup(user.id) : null);

        const questionsRequest = Promise.all([getQuestionCatalog(), progressRequest]).then(async ([questions, progress]) => {
          const eligible = reviewMissed ? questions.filter((question) => progress?.incorrectIds.has(question.id)) : questions;
          const matchingQuestions = filterQuestionCatalog(eligible, { section, difficulties, topic, topics });
          const catalog = filterQuestionsByCompletion(matchingQuestions, completion, progress?.answeredIds ?? new Set<string>());
          const firstQuestions = await getQuestionDetails(catalog.slice(0, 5).map((q) => q.id));
          return { catalog, firstQuestions };
        });

        const [loadedQuestions, user] = await Promise.all([questionsRequest, userRequest]);

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
          difficulty: difficulties.length === 1 ? difficulties[0] : null,
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
  }, [completion, difficulties, reviewMissed, section, topic, topics]);

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
    if (isLoading || isFinished || isTimerPaused || practiceQuestions.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isFinished, isLoading, isTimerPaused, practiceQuestions.length]);

  function changeTimerPaused(paused: boolean) {
    if (paused && currentQuestion) {
      const clock = questionClocks.current.get(currentQuestion.id);
      if (clock) {
        const now = performance.now();
        clock.pause(now);
        setQuestionTick({ id: currentQuestion.id, seconds: clock.seconds(now) });
      }
    }
    setIsTimerPaused(paused);
  }

  async function handleSelect(choice: string) {
    if (!currentQuestion || answers[currentQuestion.id] || submissionPending.current) {
      return;
    }
    const question = currentQuestion;
    submissionPending.current = true;
    setIsChecking(true);
    setPersistenceMessage(currentUser ? null : "Guest mode: sign in to save this practice session.");
    const clock = questionClocks.current.get(question.id) ?? new QuestionStopwatch();
    questionClocks.current.set(question.id, clock);
    const timeSpentSeconds = clock.submit(performance.now());

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [currentQuestion.id]: choice
    }));

    function unlockAnswer() {
      clock.retry(performance.now(), !isTimerPaused);
      setAnswers((previous) => {
        const next = { ...previous };
        delete next[question.id];
        return next;
      });
    }

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

      const verifiedFeedback = (await response.json()) as PracticeFeedback;
      setFeedback((currentFeedback) => ({
        ...currentFeedback,
        [currentQuestion.id]: verifiedFeedback
      }));
      if (verifiedFeedback.isCorrect) {
        setSubmittedSeconds((previous) => ({ ...previous, [question.id]: timeSpentSeconds }));
      } else {
        unlockAnswer();
      }
      if (currentUser && !verifiedFeedback.answerSaved) {
        setPersistenceMessage("Answer checked, but your result could not be saved.");
      } else if (currentUser && verifiedFeedback.isCorrect && !verifiedFeedback.timingRecorded) {
        setPersistenceMessage("Answer saved, but its timing could not be saved.");
      }
    } catch {
      unlockAnswer();
      setPersistenceMessage("The answer could not be checked. Please try again.");
    } finally {
      submissionPending.current = false;
      setIsChecking(false);
    }
  }

  const showQuestionAt = useCallback((index: number) => {
    const id = practiceQuestions[index]?.id ?? null;
    setQuestionTick({ id, seconds: id ? questionClocks.current.get(id)?.seconds(performance.now()) ?? 0 : 0 });
    setCurrentIndex(index);
  }, [practiceQuestions]);

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
    setIsTimerPaused(false);
    setReviewQuestion(null);
    setSessionId(null);

    if (!currentUser || practiceQuestions.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      const session = await createPracticeSession({
        difficulty: difficulties.length === 1 ? difficulties[0] : null,
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

  const waitingForQuestion = isLoading || (!error && !isFinished && practiceQuestions.length > 0 && !currentQuestion);
  const activeQuestion = !waitingForQuestion && !error && !isFinished ? currentQuestion : undefined;
  const backHref = reviewMissed ? "/mistakes" : section === "all" ? "/question-bank" : `/question-bank/${section}`;

  return (
    <PracticeExam
      backHref={backHref}
      currentIndex={currentIndex}
      elapsedSeconds={elapsedSeconds}
      feedbackByQuestion={feedback}
      isChecking={isChecking}
      isTimerPaused={isTimerPaused}
      isSavingResult={isSavingResult}
      key={timerRun}
      onNext={handleNext}
      onTimerPauseChange={changeTimerPaused}
      onPrevious={handlePrevious}
      onRestart={restartPractice}
      onSelect={handleSelect}
      onShowQuestion={showQuestionAt}
      persistenceMessage={persistenceMessage}
      question={activeQuestion}
      questionSeconds={questionSeconds}
      selectedAnswer={selectedAnswer}
      questions={practiceQuestions}
      userId={currentUser?.id}
    >
      {waitingForQuestion ? (
        <section className="mx-auto mt-6 w-full max-w-3xl px-5 py-6">
          <div className="flex items-center gap-3 text-sm font-black text-blue-600">
            <Loader2 className="animate-spin" size={20} />
            Loading practice questions…
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
        <section className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {persistenceMessage ? <p className="text-sm text-slate-600" role="status">{persistenceMessage}</p> : null}
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
              overlay
              question={reviewQuestion}
              selectedAnswer={answers[reviewQuestion.id] ?? null}
            />
          ) : null}
        </section>
      ) : null}
    </PracticeExam>
  );
}

function parseSection(value: string | null): SectionFilter {
  return value === "math" || value === "reading-writing" ? value : "all";
}
