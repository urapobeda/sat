"use client";

import { AlertCircle, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AITutorActions } from "@/components/ai-tutor/AITutorActions";
import { AITutorInput } from "@/components/ai-tutor/AITutorInput";
import { AITutorMessage } from "@/components/ai-tutor/AITutorMessage";
import {
  AI_TUTOR_QUESTION_LIMIT,
  AI_TUTOR_SESSION_LIMIT,
  createTutorRequest,
  type AITutorAction,
  type AITutorChatMessage,
  type AITutorResponse
} from "@/lib/aiTutor";
import type { Question } from "@/types/sat";

type AITutorPanelProps = {
  hasSubmittedOverride?: boolean;
  isOpen: boolean;
  onClose: () => void;
  question: Question;
  selectedAnswer: string | null;
};

type LastRequest = {
  action: AITutorAction;
  message: string;
};

type ErrorPayload = {
  error: string;
};

export function AITutorPanel({
  hasSubmittedOverride,
  isOpen,
  onClose,
  question,
  selectedAnswer
}: AITutorPanelProps) {
  const hasSubmitted = hasSubmittedOverride ?? selectedAnswer !== null;
  const [messages, setMessages] = useState<AITutorChatMessage[]>(() => [
    createGreetingMessage(question, hasSubmitted)
  ]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<LastRequest | null>(null);
  const [sessionRequests, setSessionRequests] = useState(() =>
    readNumberFromSessionStorage("aiTutorTotal")
  );
  const [questionRequests, setQuestionRequests] = useState(() =>
    readNumberFromSessionStorage(getQuestionStorageKey(question.id))
  );
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const reachedLimit =
    sessionRequests >= AI_TUTOR_SESSION_LIMIT ||
    questionRequests >= AI_TUTOR_QUESTION_LIMIT;
  const disabled = isPending || reachedLimit;
  const limitMessage = reachedLimit
    ? "You have reached the AI Tutor limit for this session."
    : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isPending]);

  const subtitle = useMemo(
    () =>
      hasSubmitted
        ? "Now I can explain the answer and your reasoning."
        : "I can hint, guide, and ask questions without giving away the answer.",
    [hasSubmitted]
  );

  if (!isOpen) {
    return null;
  }

  async function sendTutorMessage(action: AITutorAction, message: string) {
    if (disabled || !message.trim()) {
      return;
    }

    const request: LastRequest = { action, message };
    setLastRequest(request);
    setError(null);
    setIsPending(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        content: message,
        id: createId(),
        role: "user"
      }
    ]);

    try {
      const response = await fetch("/api/ai-tutor", {
        body: JSON.stringify(
          createTutorRequest({
            action,
            hasSubmitted,
            message,
            question,
            selectedAnswer
          })
        ),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(payload));
      }

      const tutorResponse = payload as AITutorResponse;
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          content: tutorResponse.message,
          id: createId(),
          response: tutorResponse,
          role: "assistant"
        }
      ]);
      incrementLocalUsage(question.id, setSessionRequests, setQuestionRequests);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "AI Tutor is unavailable right now. Please try again."
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        aria-label="Close AI Tutor"
        className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        type="button"
      />
      <aside className="fixed inset-x-3 bottom-3 z-50 flex max-h-[85vh] flex-col overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl shadow-blue-950/20 lg:sticky lg:top-24 lg:z-10 lg:h-[calc(100vh-8rem)] lg:max-h-none lg:w-[420px]">
        <header className="border-b border-slate-100 bg-gradient-to-br from-white via-blue-50 to-violet-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <Sparkles size={22} />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">
                  AI Tutor
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  SAT question coach
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-600">{subtitle}</p>
              </div>
            </div>
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              onClick={onClose}
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <AITutorMessage key={message.id} message={message} />
            ))}
            {isPending ? (
              <div className="flex items-center gap-3 rounded-3xl border border-blue-100 bg-white px-4 py-3 text-sm font-black text-blue-700 shadow-sm">
                <Loader2 className="animate-spin" size={18} />
                AI Tutor is thinking...
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-100 bg-white p-4">
          {error || limitMessage ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-bold text-rose-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 shrink-0" size={17} />
                <span>{limitMessage ?? error}</span>
              </div>
              {error && lastRequest ? (
                <button
                  className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-rose-700 shadow-sm transition hover:bg-rose-100"
                  disabled={isPending}
                  onClick={() => sendTutorMessage(lastRequest.action, lastRequest.message)}
                  type="button"
                >
                  <RotateCcw size={14} />
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}
          <AITutorActions
            disabled={disabled}
            hasSubmitted={hasSubmitted}
            onAction={sendTutorMessage}
          />
          <AITutorInput
            disabled={disabled}
            onSend={(message) => sendTutorMessage("ask", message)}
          />
          <p className="text-center text-xs font-bold text-slate-500">
            {questionRequests} / {AI_TUTOR_QUESTION_LIMIT} for this question ·{" "}
            {sessionRequests} / {AI_TUTOR_SESSION_LIMIT} this session
          </p>
        </div>
      </aside>
    </>
  );
}

function createGreetingMessage(
  question: Question,
  hasSubmitted: boolean
): AITutorChatMessage {
  return {
    content: hasSubmitted
      ? `I can review this ${question.topic} question with you now that your answer is submitted.`
      : `Need help with this ${question.topic} question? I will guide you without revealing the answer.`,
    id: createId(),
    role: "assistant"
  };
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getQuestionStorageKey(questionId: string) {
  return `aiTutorQuestion:${questionId}`;
}

function readNumberFromSessionStorage(key: string) {
  if (typeof window === "undefined") {
    return 0;
  }

  return Number(window.sessionStorage.getItem(key) ?? 0);
}

function incrementLocalUsage(
  questionId: string,
  setSessionRequests: (updater: (value: number) => number) => void,
  setQuestionRequests: (updater: (value: number) => number) => void
) {
  setSessionRequests((currentValue) => {
    const nextValue = currentValue + 1;
    window.sessionStorage.setItem("aiTutorTotal", String(nextValue));

    return nextValue;
  });
  setQuestionRequests((currentValue) => {
    const nextValue = currentValue + 1;
    window.sessionStorage.setItem(getQuestionStorageKey(questionId), String(nextValue));

    return nextValue;
  });
}

function getErrorMessage(payload: unknown) {
  if (isErrorPayload(payload)) {
    return payload.error;
  }

  return "AI Tutor is unavailable right now. Please try again.";
}

function isErrorPayload(payload: unknown): payload is ErrorPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  );
}
