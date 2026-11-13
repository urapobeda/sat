import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AI_TUTOR_DAILY_LIMIT
} from "@/lib/aiTutor";
import {
  getQuestionPublicContext,
  getQuestionSolution
} from "@/lib/server/questionSolutions";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
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

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return jsonError("Sign in to use AI Tutor.", 401);

    const parsedRequest = tutorRequestSchema.safeParse(await request.json());

    if (!parsedRequest.success) {
      return jsonError("Please send a valid SAT question and tutor request.", 400);
    }

    const question = await getQuestionPublicContext(parsedRequest.data.questionId);
    const solution = await hasVerifiedAnswer(userId, parsedRequest.data.questionId)
      ? await getQuestionSolution(parsedRequest.data.questionId)
      : null;
    const openai = getOpenAIClient();
    const model = getOpenAIModel();
    // Reserve quota atomically before invoking the paid AI service. Failed AI
    // requests still count, so retries cannot bypass the daily spending cap.
    const { data: dailyCount, error: usageError } = await getSupabaseAdminClient()
      .rpc("consume_ai_tutor_usage", { p_user_id: userId });
    if (usageError) return jsonError("AI Tutor usage could not be checked. Please try again.", 503);
    if (dailyCount === null) return jsonError(`You have reached the AI Tutor daily limit of ${AI_TUTOR_DAILY_LIMIT} requests.`, 429);
    if (!Number.isInteger(dailyCount) || dailyCount < 1 || dailyCount > AI_TUTOR_DAILY_LIMIT) {
      return jsonError("AI Tutor usage could not be checked. Please try again.", 503);
    }

    const response = await openai.responses.create({
      input: buildTutorPrompt({
        request: parsedRequest.data,
        question,
        solution
      }),
      instructions: TUTOR_INSTRUCTIONS,
      max_output_tokens: 700,
      model,
      safety_identifier: userId,
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
      return jsonError("AI Tutor did not return a usable response.", 502);
    }

    const parsedTutorResponse = tutorResponseSchema.safeParse(JSON.parse(content));

    if (!parsedTutorResponse.success) {
      return jsonError("AI Tutor returned an unexpected response format.", 502);
    }

    return NextResponse.json({ ...parsedTutorResponse.data, dailyUsage: { count: dailyCount, limit: AI_TUTOR_DAILY_LIMIT } });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("Please send valid JSON.", 400);
    }

    return jsonError("AI Tutor is unavailable right now. Please try again.", 500);
  }
}

async function hasVerifiedAnswer(userId: string, questionId: string) {
  const supabase = getSupabaseAdminClient();
  const results = await Promise.all(
    (["practice_answers", "test_answers"] as const).map((table) =>
      supabase.from(table).select("question_id")
        .eq("question_id", questionId)
        .eq("user_id", userId)
        .not("selected_answer", "is", null)
        .in("is_correct", table === "practice_answers" ? [true] : [true, false])
        .limit(1)
    )
  );
  return results.some(({ data, error }) => !error && Boolean(data?.length));
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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
    .map((choice) => `${choice.label}. ${choice.text || (choice.imageUrl ? "[graph]" : "")}`)
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
