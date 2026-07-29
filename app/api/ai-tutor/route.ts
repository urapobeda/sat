import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AI_TUTOR_QUESTION_LIMIT,
  AI_TUTOR_SESSION_LIMIT,
  type AITutorResponse
} from "@/lib/aiTutor";
import {
  getQuestionPublicContext,
  getQuestionSolution
} from "@/lib/server/questionSolutions";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";

const tutorRequestSchema = z.object({
  action: z.enum(["hint", "next-step", "explain", "explain-mistake", "ask"]),
  contextType: z.enum(["practice", "test-review", "past-paper-review"]),
  message: z.string().trim().min(1).max(1200),
  questionId: z.string().uuid(),
  selectedAnswer: z.string().trim().max(500).optional()
});

const tutorResponseSchema = z.object({
  followUpQuestion: z.string().trim().min(1).max(300).nullable(),
  message: z.string().trim().min(1).max(1200),
  steps: z.array(z.string().trim().min(1).max(500)).max(5),
  title: z.string().trim().min(1).max(100)
});

type SessionUsage = {
  questions: Map<string, number>;
  total: number;
};

const sessionUsage = new Map<string, SessionUsage>();

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("ai_tutor_session")?.value ?? crypto.randomUUID();

  try {
    const parsedRequest = tutorRequestSchema.safeParse(await request.json());

    if (!parsedRequest.success) {
      return jsonError("Please send a valid SAT question and tutor request.", 400, sessionId);
    }

    const usageError = consumeSessionUsage(sessionId, parsedRequest.data.questionId);

    if (usageError) {
      return jsonError(usageError, 429, sessionId);
    }

    const question = await getQuestionPublicContext(parsedRequest.data.questionId);
    const canRevealSolution =
      parsedRequest.data.contextType === "test-review" ||
      parsedRequest.data.contextType === "past-paper-review" ||
      Boolean(parsedRequest.data.selectedAnswer);
    const solution = canRevealSolution
      ? await getQuestionSolution(parsedRequest.data.questionId)
      : null;
    const openai = getOpenAIClient();
    const model = getOpenAIModel();

    const response = await openai.responses.create({
      input: buildTutorPrompt({
        request: parsedRequest.data,
        question,
        solution
      }),
      instructions: TUTOR_INSTRUCTIONS,
      max_output_tokens: 700,
      model,
      safety_identifier: sessionId,
      store: false,
      text: {
        format: {
          description: "A short SAT tutor response for the current question.",
          name: "sat_ai_tutor_response",
          schema: {
            additionalProperties: false,
            properties: {
              followUpQuestion: {
                anyOf: [{ type: "string" }, { type: "null" }]
              },
              message: { type: "string" },
              steps: {
                items: { type: "string" },
                type: "array"
              },
              title: { type: "string" }
            },
            required: ["title", "message", "steps", "followUpQuestion"],
            type: "object"
          },
          strict: true,
          type: "json_schema"
        }
      }
    });

    const content = response.output_text;

    if (!content) {
      return jsonError("AI Tutor did not return a usable response.", 502, sessionId);
    }

    const parsedTutorResponse = tutorResponseSchema.safeParse(JSON.parse(content));

    if (!parsedTutorResponse.success) {
      return jsonError("AI Tutor returned an unexpected response format.", 502, sessionId);
    }

    return jsonResponse(parsedTutorResponse.data, 200, sessionId);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("Please send valid JSON.", 400, sessionId);
    }

    const message =
      error instanceof Error && error.message.includes("OPENAI_")
        ? error.message
        : "AI Tutor is unavailable right now. Please try again.";

    return jsonError(message, 500, sessionId);
  }
}

function consumeSessionUsage(sessionId: string, questionId: string) {
  const usage = sessionUsage.get(sessionId) ?? { questions: new Map<string, number>(), total: 0 };
  const questionCount = usage.questions.get(questionId) ?? 0;

  if (usage.total >= AI_TUTOR_SESSION_LIMIT || questionCount >= AI_TUTOR_QUESTION_LIMIT) {
    return "You have reached the AI Tutor limit for this session.";
  }

  usage.total += 1;
  usage.questions.set(questionId, questionCount + 1);
  sessionUsage.set(sessionId, usage);

  return null;
}

function jsonResponse(
  body: AITutorResponse,
  status: number,
  sessionId: string
) {
  const response = NextResponse.json(body, { status });
  response.cookies.set("ai_tutor_session", sessionId, {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}

function jsonError(message: string, status: number, sessionId: string) {
  const response = NextResponse.json({ error: message }, { status });
  response.cookies.set("ai_tutor_session", sessionId, {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}

function buildTutorPrompt({
  question,
  request,
  solution
}: {
  question: Awaited<ReturnType<typeof getQuestionPublicContext>>;
  request: z.infer<typeof tutorRequestSchema>;
  solution: Awaited<ReturnType<typeof getQuestionSolution>> | null;
}) {
  const choices = question.choices
    .map((choice, index) => `${String.fromCharCode(65 + index)}. ${choice}`)
    .join("\n");
  const submittedContext = solution
    ? [
        `Selected answer: ${request.selectedAnswer ?? "No answer selected"}`,
        `Correct answer: ${solution.correct_answer}`,
        `Existing explanation: ${solution.explanation}`
      ].join("\n")
    : "The student has not submitted an answer yet. Do not reveal the correct answer, the answer letter, or a full solution.";

  return [
    `Action: ${request.action}`,
    `Context type: ${request.contextType}`,
    `Student message: ${request.message}`,
    `Section: ${question.section}`,
    `Topic: ${question.topic}`,
    `Difficulty: ${question.difficulty}`,
    `Question: ${question.question}`,
    `Choices:\n${choices}`,
    submittedContext
  ].join("\n\n");
}

const TUTOR_INSTRUCTIONS = [
  "You are an expert Digital SAT tutor inside a SAT Practice Hub app.",
  "Detect the student's language from their message and answer in the same language.",
  "Keep responses concise, warm, and instructional.",
  "Return only JSON matching the provided schema.",
  "Before the student submits an answer, never reveal the correct answer, answer letter, full solution, or eliminate choices in a way that gives away the answer. Give one useful hint, one next step, and a guiding question.",
  "After the student submits an answer, explain the correct answer, the student's mistake if any, the key SAT concept, and why tempting alternatives are wrong.",
  "For Math, show step-by-step calculations and explain formulas plainly.",
  "For Reading and Writing, rely only on the question text and explain grammar, logic, transitions, vocabulary, or structure rules."
].join("\n");
